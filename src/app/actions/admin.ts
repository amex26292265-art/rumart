"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { runAllRules } from "@/lib/sync/sync-service";
import { SITE_SETTING_KEYS } from "@/lib/site-settings";
import { encryptSecret } from "@/lib/crypto";
import { invalidate } from "@/lib/cache";

async function requireAdmin() {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => {
  const n = parseFloat(String(fd.get(k) ?? ""));
  return Number.isFinite(n) ? n : null;
};
const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";

/** Run every enabled sync rule now (inline). Returns a summary for the UI. */
export async function triggerSync(): Promise<
  { imported: number; updated: number; removed?: number } | { error: string }
> {
  await requireAdmin();
  try {
    const res = await runAllRules();
    invalidate("cat-");
    invalidate("trending-");
    invalidate("newest-");
    revalidatePath("/admin", "layout");
    revalidatePath("/marketplace");
    revalidatePath("/");
    return { imported: res.imported, updated: res.updated, removed: res.removed };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sync failed" };
  }
}

export async function purgeNoCaptureProducts(): Promise<{ deleted: number } | { error: string }> {
  await requireAdmin();
  try {
    const { purgeBadProducts } = await import("@/lib/sync/sync-service");
    const res = await purgeBadProducts();
    revalidatePath("/admin", "layout");
    revalidatePath("/marketplace");
    revalidatePath("/");
    return { deleted: res.deleted };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Purge failed" };
  }
}

export async function toggleSyncRule(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const rule = await prisma.syncRule.findUnique({ where: { id } });
  if (rule) await prisma.syncRule.update({ where: { id }, data: { enabled: !rule.enabled } });
  revalidatePath("/admin/sync");
}

export async function saveSyncRule(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const data = {
    name: str(fd, "name"),
    supplierCategory: str(fd, "supplierCategory"),
    categoryId: str(fd, "categoryId"),
    minSellerRating: num(fd, "minSellerRating"),
    maxSupplierPrice: num(fd, "maxSupplierPrice"),
    minSupplierPrice: num(fd, "minSupplierPrice"),
    country: str(fd, "country") || null,
    autoDeliveryOnly: bool(fd, "autoDeliveryOnly"),
    maxImport: Math.round(num(fd, "maxImport") ?? 30),
    enabled: bool(fd, "enabled"),
  };
  if (!data.name || !data.categoryId || !data.supplierCategory) return;
  if (id) await prisma.syncRule.update({ where: { id }, data });
  else await prisma.syncRule.create({ data });
  revalidatePath("/admin/sync");
}

export async function deleteSyncRule(fd: FormData) {
  await requireAdmin();
  await prisma.syncRule.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/admin/sync");
}

export async function savePricingRule(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const categoryId = str(fd, "categoryId");
  const data = {
    name: str(fd, "name"),
    categoryId: categoryId || null,
    type: str(fd, "type") || "percent",
    value: num(fd, "value") ?? 25,
    minMargin: num(fd, "minMargin"),
    maxMargin: num(fd, "maxMargin"),
    rounding: str(fd, "rounding") || "none",
    priority: Math.round(num(fd, "priority") ?? 0),
    enabled: bool(fd, "enabled"),
  };
  if (!data.name) return;
  if (id) await prisma.pricingRule.update({ where: { id }, data });
  else await prisma.pricingRule.create({ data });
  revalidatePath("/admin/pricing");
}

export async function deletePricingRule(fd: FormData) {
  await requireAdmin();
  await prisma.pricingRule.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/admin/pricing");
}

export async function setProductStatus(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const status = str(fd, "status");
  if (["active", "hidden", "unavailable"].includes(status)) {
    await prisma.product.update({ where: { id }, data: { status } });
  }
  revalidatePath("/admin/products");
}

/** Edit a product's price, description and status by hand. */
export async function updateProduct(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const price = num(fd, "price");
  const status = str(fd, "status");
  const data: {
    price?: number;
    description?: string | null;
    title?: string;
    status?: string;
  } = {};
  if (price !== null && price >= 0) data.price = price;
  data.description = str(fd, "description") || null;
  if (str(fd, "title")) data.title = str(fd, "title");
  if (["active", "hidden", "unavailable"].includes(status)) data.status = status;
  await prisma.product.update({ where: { id }, data });
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
}

/** Create a manual (non-LZT) product with optional encrypted credential stock. */
export async function createManualProduct(
  fd: FormData,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  await requireAdmin();
  const title = str(fd, "title");
  const categoryId = str(fd, "categoryId");
  const price = num(fd, "price");
  const description = str(fd, "description") || null;
  const imagesRaw = str(fd, "images");
  const credentialJson = str(fd, "credentialJson");
  const deliveryType = str(fd, "deliveryType") === "auto" ? "auto" : "manual";

  if (title.length < 8) return { ok: false, error: "Title must be at least 8 characters." };
  if (!categoryId) return { ok: false, error: "Category is required." };
  if (price == null || price <= 0) return { ok: false, error: "Enter a positive price." };

  const manual = await prisma.supplier.upsert({
    where: { slug: "manual" },
    update: {},
    create: { slug: "manual", name: "Manual / Custom" },
  });

  const slugBase = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  const slug = `${slugBase || "product"}-${Date.now().toString(36)}`;

  let credentialStock: string | null = null;
  let stock = 1;
  if (credentialJson) {
    try {
      const parsed = JSON.parse(credentialJson);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      credentialStock = encryptSecret(JSON.stringify(arr));
      stock = arr.length;
    } catch {
      return { ok: false, error: "Credential JSON is invalid." };
    }
  }

  const images = imagesRaw
    ? imagesRaw
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const product = await prisma.product.create({
    data: {
      slug,
      title,
      description,
      price,
      cost: price * 0.5,
      currency: "USD",
      status: "active",
      deliveryType,
      stock,
      sourceType: "manual",
      credentialStock,
      images: images.length ? images : undefined,
      supplierId: manual.id,
      categoryId,
      supplierItemId: `manual-${slug}`,
    },
  });

  revalidatePath("/admin/products");
  revalidatePath("/marketplace");
  return { ok: true, slug: product.slug };
}

export async function reviewSellerApplication(
  fd: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const id = str(fd, "id");
  const decision = str(fd, "decision"); // approve | reject
  const app = await prisma.sellerApplication.findUnique({ where: { id } });
  if (!app) return { ok: false, error: "Application not found." };
  if (app.status !== "pending") return { ok: false, error: "Already reviewed." };

  if (decision === "reject") {
    await prisma.sellerApplication.update({
      where: { id },
      data: { status: "rejected", adminNote: str(fd, "adminNote") || null },
    });
    await prisma.notification.create({
      data: {
        userId: app.userId,
        title: "Seller application declined",
        body: "Your seller application was not approved. Contact support if you have questions.",
      },
    });
    revalidatePath("/admin/sellers");
    return { ok: true };
  }

  const base =
    app.displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "seller";
  let slug = base;
  let n = 0;
  while (await prisma.sellerProfile.findUnique({ where: { slug } })) {
    n++;
    slug = `${base}-${n}`;
  }

  await prisma.$transaction([
    prisma.sellerApplication.update({ where: { id }, data: { status: "approved" } }),
    prisma.sellerProfile.create({
      data: {
        userId: app.userId,
        slug,
        displayName: app.displayName,
        bio: app.bio,
        badge: "verified",
        verified: true,
        status: "active",
      },
    }),
    prisma.user.update({ where: { id: app.userId }, data: { role: "seller" } }),
    prisma.notification.create({
      data: {
        userId: app.userId,
        title: "Seller application approved",
        body: "Welcome aboard — open your seller dashboard to list products.",
      },
    }),
  ]);

  revalidatePath("/admin/sellers");
  revalidatePath("/seller");
  return { ok: true };
}

export async function moderateReview(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const status = str(fd, "status");
  if (!["published", "hidden", "pending"].includes(status)) return;
  await prisma.review.update({ where: { id }, data: { status } });
  revalidatePath("/admin/reviews");
}

/**
 * Manually fulfill a pending order: encrypt the credentials the admin pastes,
 * attach them to the order, mark it completed and notify the customer. This is
 * how orders that fell back to "pending manual fulfillment" get delivered.
 */
export async function fulfillOrderManually(
  fd: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const reference = str(fd, "reference");
  const credentials = str(fd, "credentials");
  if (!reference || !credentials) return { ok: false, error: "Reference and credentials are required." };

  const order = await prisma.order.findUnique({
    where: { reference },
    include: { items: true },
  });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status === "completed") return { ok: false, error: "Order is already completed." };

  await prisma.credential.create({
    data: {
      orderId: order.id,
      productTitle: order.items[0]?.title ?? "Account",
      ciphertext: encryptSecret(credentials),
    },
  });
  await prisma.order.update({ where: { id: order.id }, data: { status: "completed" } });
  await prisma.notification
    .create({
      data: {
        userId: order.userId,
        title: `Order ${reference} delivered`,
        body: "Your account has been delivered. Open your order to view the credentials.",
      },
    })
    .catch(() => undefined);

  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${reference}`);
  return { ok: true };
}

/**
 * Manually credit a customer's wallet (by email). Use this to fund an account
 * after a customer pays by another method (or to top up your own account for
 * testing) while the crypto gateway is unavailable.
 */
export async function creditWallet(fd: FormData): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  await requireAdmin();
  const email = str(fd, "email").toLowerCase();
  const amount = num(fd, "amount");
  if (!email) return { ok: false, error: "Customer email is required." };
  if (amount == null || amount <= 0) return { ok: false, error: "Enter a positive amount." };
  if (amount > 100000) return { ok: false, error: "Amount too large." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: false, error: `No account found for ${email}.` };

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { walletBalance: { increment: amount } },
  });
  await prisma.deposit
    .create({
      data: { userId: user.id, amount, currency: "USD", provider: "manual", status: "paid", credited: true },
    })
    .catch(() => undefined);
  await prisma.notification
    .create({
      data: {
        userId: user.id,
        title: `Wallet credited +$${amount.toFixed(2)}`,
        body: `Your Rumart wallet balance is now $${updated.walletBalance.toFixed(2)}.`,
      },
    })
    .catch(() => undefined);

  revalidatePath("/admin", "layout");
  return { ok: true, balance: updated.walletBalance };
}

/** Refund a pending/failed order back to the customer's wallet and cancel it. */
export async function refundOrder(fd: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const reference = str(fd, "reference");
  const order = await prisma.order.findUnique({ where: { reference } });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status === "completed") return { ok: false, error: "Completed orders can't be auto-refunded." };
  if (order.status === "refunded") return { ok: false, error: "Order already refunded." };

  await prisma.$transaction([
    prisma.user.update({ where: { id: order.userId }, data: { walletBalance: { increment: order.total } } }),
    prisma.order.update({ where: { id: order.id }, data: { status: "refunded" } }),
    prisma.notification.create({
      data: {
        userId: order.userId,
        title: `Order ${reference} refunded`,
        body: `${order.total.toFixed(2)} ${order.currency} has been returned to your wallet.`,
      },
    }),
  ]);
  revalidatePath("/admin/orders");
  return { ok: true };
}

// ─── Promo codes ───────────────────────────────────────────────────────────
export async function savePromoCode(fd: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const code = str(fd, "code").toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return { ok: false, error: "Code must be 3–32 letters/numbers." };
  const type = str(fd, "type") === "flat" ? "flat" : "percent";
  const value = num(fd, "value");
  if (value == null || value <= 0) return { ok: false, error: "Enter a positive discount value." };
  if (type === "percent" && value > 100) return { ok: false, error: "Percent discount can’t exceed 100." };

  const data = {
    code,
    type,
    value,
    maxUses: fd.get("maxUses") ? Math.round(num(fd, "maxUses") ?? 0) : null,
    perUser: Math.max(1, Math.round(num(fd, "perUser") ?? 1)),
    minOrder: fd.get("minOrder") ? num(fd, "minOrder") : null,
    maxDiscount: fd.get("maxDiscount") ? num(fd, "maxDiscount") : null,
    active: bool(fd, "active"),
  };
  await prisma.promoCode.upsert({ where: { code }, update: data, create: data });
  revalidatePath("/admin/promos");
  return { ok: true };
}

export async function togglePromoCode(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const p = await prisma.promoCode.findUnique({ where: { id } });
  if (p) await prisma.promoCode.update({ where: { id }, data: { active: !p.active } });
  revalidatePath("/admin/promos");
}

export async function deletePromoCode(fd: FormData) {
  await requireAdmin();
  await prisma.promoCode.delete({ where: { id: str(fd, "id") } });
  revalidatePath("/admin/promos");
}

/** Save editable site settings (Telegram handle, support note, tagline). */
export async function saveSiteSettings(fd: FormData) {
  await requireAdmin();
  for (const key of SITE_SETTING_KEYS) {
    if (!fd.has(key)) continue;
    const value = str(fd, key);
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  invalidate("site-settings");
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
}

/**
 * One-click: create an enabled sync rule for every storefront category that
 * maps to a valid supplier category. Running sync afterwards can then import
 * thousands of accounts across all games at once.
 */
export async function generateAllRules(): Promise<{ created: number; updated: number }> {
  await requireAdmin();
  const categories = await prisma.category.findMany();
  let created = 0;
  let updated = 0;
  for (const c of categories) {
    if (!c.supplierCategory) continue;
    const name = `${c.name} — auto`;
    const existing = await prisma.syncRule.findFirst({ where: { categoryId: c.id } });
    if (existing) {
      await prisma.syncRule.update({
        where: { id: existing.id },
        data: { enabled: true, supplierCategory: c.supplierCategory, maxImport: 600 },
      });
      updated++;
    } else {
      await prisma.syncRule.create({
        data: {
          name,
          enabled: true,
          categoryId: c.id,
          supplierCategory: c.supplierCategory,
          autoDeliveryOnly: false,
          maxImport: 600,
        },
      });
      created++;
    }
  }
  revalidatePath("/admin/sync");
  return { created, updated };
}

// ─── Admin team ────────────────────────────────────────────────────────────
export async function createAdminUser(fd: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  const name = str(fd, "name") || null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email." };
  if (password.length < 10) return { ok: false, error: "Password must be at least 10 characters." };

  const { hashPassword } = await import("@/lib/password");
  const passwordHash = await hashPassword(password);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: "admin", passwordHash, name: name ?? existing.name },
    });
  } else {
    await prisma.user.create({
      data: { email, passwordHash, name, role: "admin" },
    });
  }
  revalidatePath("/admin/team");
  return { ok: true };
}

export async function setUserRole(fd: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const id = str(fd, "id");
  const role = str(fd, "role");
  if (!["customer", "admin", "seller"].includes(role)) return { ok: false, error: "Invalid role." };
  const session = await auth();
  const selfId = (session?.user as { id?: string } | undefined)?.id;
  if (selfId && selfId === id && role !== "admin") {
    return { ok: false, error: "You can’t demote yourself." };
  }
  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/admin/team");
  return { ok: true };
}

// ─── Category banners / logos ──────────────────────────────────────────────
export async function saveCategoryBranding(fd: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const id = str(fd, "id");
  const logoUrl = str(fd, "logoUrl") || null;
  const bannerUrl = str(fd, "bannerUrl") || null;
  const accent = str(fd, "accent") || "#7c3aed";
  const featured = bool(fd, "featured");
  await prisma.category.update({
    where: { id },
    data: { logoUrl, bannerUrl, accent, featured },
  });
  invalidate("cat-");
  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePath("/categories");
  return { ok: true };
}

/** Apply default /brands/{slug}.svg logos for known categories. */
export async function seedCategoryLogos(): Promise<{ updated: number }> {
  await requireAdmin();
  const cats = await prisma.category.findMany();
  let updated = 0;
  for (const c of cats) {
    const logoUrl = `/brands/${c.slug === "riot" ? "valorant" : c.slug === "socialclub" ? "gta" : c.slug}.svg`;
    // Only set when file is one we ship, or leave custom
    const known = [
      "fortnite",
      "valorant",
      "steam",
      "discord",
      "telegram",
      "roblox",
      "minecraft",
      "ea",
      "instagram",
      "tiktok",
      "chatgpt",
      "claude",
      "cursor",
      "epicgames",
      "gta",
      "genshin",
      "ai",
    ];
    const slug = c.slug === "riot" ? "valorant" : c.slug === "socialclub" ? "gta" : c.slug;
    if (!known.includes(slug)) continue;
    await prisma.category.update({
      where: { id: c.id },
      data: { logoUrl: c.logoUrl || logoUrl },
    });
    updated++;
  }
  invalidate("cat-");
  revalidatePath("/admin/categories");
  revalidatePath("/");
  return { updated };
}
