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
export async function triggerSync(): Promise<{ imported: number; updated: number } | { error: string }> {
  await requireAdmin();
  try {
    const res = await runAllRules();
    invalidate("cat-");
    invalidate("trending-");
    revalidatePath("/admin", "layout");
    return { imported: res.imported, updated: res.updated };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Sync failed" };
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
