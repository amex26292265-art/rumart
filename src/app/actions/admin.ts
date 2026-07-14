"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { runAllRules } from "@/lib/sync/sync-service";
import { SITE_SETTING_KEYS } from "@/lib/site-settings";

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

/** Save editable site settings (Telegram handle, support note, tagline). */
export async function saveSiteSettings(fd: FormData) {
  await requireAdmin();
  for (const key of SITE_SETTING_KEYS) {
    if (!fd.has(key)) continue;
    const value = str(fd, key);
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
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
