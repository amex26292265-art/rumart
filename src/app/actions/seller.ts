"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function applyAsSeller(input: {
  displayName: string;
  bio?: string;
  experience?: string;
  categories?: string;
  country?: string;
  portfolio?: string;
  discord?: string;
  telegram?: string;
  website?: string;
  reason?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false, error: "Please sign in." };

  const displayName = input.displayName.trim();
  if (displayName.length < 3) return { ok: false, error: "Display name must be at least 3 characters." };

  const existingProfile = await prisma.sellerProfile.findUnique({ where: { userId } });
  if (existingProfile) return { ok: false, error: "You are already a seller." };

  const pending = await prisma.sellerApplication.findFirst({
    where: { userId, status: "pending" },
  });
  if (pending) return { ok: false, error: "You already have a pending application." };

  await prisma.sellerApplication.create({
    data: {
      userId,
      displayName,
      bio: input.bio?.trim() || null,
      experience: input.experience?.trim() || null,
      categories: input.categories?.trim() || null,
      country: input.country?.trim() || null,
      portfolio: input.portfolio?.trim() || null,
      discord: input.discord?.trim() || null,
      telegram: input.telegram?.trim() || null,
      website: input.website?.trim() || null,
      reason: input.reason?.trim() || null,
    },
  });
  await writeAudit(userId, "seller.apply", { displayName });
  try {
    const { discordEvent } = await import("@/lib/discord");
    await discordEvent("Seller application", `${displayName} applied to sell on Rumart.`, [
      { name: "Categories", value: input.categories?.trim() || "—", inline: true },
      { name: "Country", value: input.country?.trim() || "—", inline: true },
    ]);
  } catch {
    /* optional */
  }
  revalidatePath("/sell");
  revalidatePath("/admin/sellers");
  return { ok: true };
}

export async function createSellerListing(input: {
  title: string;
  description?: string;
  price: number;
  categoryId: string;
  deliveryType?: "auto" | "manual";
  credentialJson?: string;
}): Promise<{ ok: boolean; error?: string; slug?: string }> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false, error: "Please sign in." };

  const profile = await prisma.sellerProfile.findUnique({ where: { userId } });
  if (!profile || profile.status !== "active") return { ok: false, error: "Seller account required." };

  const title = input.title.trim();
  if (title.length < 8) return { ok: false, error: "Title must be at least 8 characters." };
  if (!(input.price > 0)) return { ok: false, error: "Price must be positive." };

  const manual = await prisma.supplier.upsert({
    where: { slug: "manual" },
    update: {},
    create: { slug: "manual", name: "Manual / Seller" },
  });

  const base = slugify(title) || "listing";
  const slug = `${base}-${Date.now().toString(36)}`;

  const { encryptSecret } = await import("@/lib/crypto");
  let credentialStock: string | null = null;
  if (input.credentialJson?.trim()) {
    try {
      const parsed = JSON.parse(input.credentialJson);
      credentialStock = encryptSecret(JSON.stringify(Array.isArray(parsed) ? parsed : [parsed]));
    } catch {
      return { ok: false, error: "Credential JSON is invalid." };
    }
  }

  const product = await prisma.product.create({
    data: {
      slug,
      title,
      description: input.description?.trim() || null,
      price: input.price,
      cost: input.price * 0.85,
      currency: "USD",
      status: "active",
      deliveryType: input.deliveryType ?? "manual",
      stock: credentialStock ? 1 : 1,
      sourceType: "seller",
      credentialStock,
      sellerId: profile.id,
      supplierId: manual.id,
      categoryId: input.categoryId,
      supplierItemId: `seller-${slug}`,
    },
  });

  revalidatePath("/seller");
  revalidatePath("/marketplace");
  return { ok: true, slug: product.slug };
}
