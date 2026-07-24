import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSupplier } from "@/lib/suppliers/registry";
import { applyPricing, resolveCategoryPricing } from "@/lib/pricing/engine";
import { slugify } from "@/lib/utils";
import { LZT_CATEGORIES, isValidLztCategory } from "@/lib/suppliers/lzt/adapter";
import { hasFullCapture, isJunkTitle, type TitleAttrs } from "@/lib/suppliers/lzt/titles";
import type { SupplierListing } from "@/lib/suppliers/types";
import { invalidate } from "@/lib/cache";

/**
 * Synchronization service. Runs configured sync rules against a supplier:
 *   import new listings → update prices/stock → remove unavailable / no-capture ones.
 */

interface RuleFilter {
  keywords: string[];
  whitelist: string[];
  blacklist: string[];
  maxImport: number;
}

function passesTextFilters(listing: SupplierListing, f: RuleFilter): boolean {
  const title = listing.title.toLowerCase();
  if (f.blacklist.some((w) => title.includes(w.toLowerCase()))) return false;
  if (f.whitelist.length && !f.whitelist.some((w) => title.includes(w.toLowerCase()))) return false;
  if (f.keywords.length && !f.keywords.some((w) => title.includes(w.toLowerCase()))) return false;
  return true;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function attrsFromJson(value: unknown): TitleAttrs {
  if (!value || typeof value !== "object") return {};
  const at = value as Record<string, unknown>;
  return {
    level: typeof at.level === "number" ? at.level : null,
    emailNative: at.emailNative === true,
    vac: at.vac === true,
    personal: at.personal === true,
    sda: at.sda === true,
    warranty: typeof at.warranty === "string" ? at.warranty : null,
    country: typeof at.country === "string" ? at.country : null,
    games: Array.isArray(at.games) ? at.games.filter((g): g is string => typeof g === "string") : [],
    tags: Array.isArray(at.tags) ? at.tags.filter((g): g is string => typeof g === "string") : [],
    stats: Array.isArray(at.stats)
      ? (at.stats as { label?: unknown; value?: unknown }[])
          .filter((s) => typeof s?.label === "string" && typeof s?.value === "string")
          .map((s) => ({ label: s.label as string, value: s.value as string }))
      : [],
    origin: typeof at.origin === "string" ? at.origin : null,
  };
}

/** Hard-delete junk / empty-capture products. Safe to run anytime. */
export async function purgeBadProducts(): Promise<{ deleted: number; ids: string[] }> {
  const active = await prisma.product.findMany({
    where: { status: { in: ["active", "hidden", "unavailable"] }, sourceType: { in: ["lzt", "manual"] } },
    select: {
      id: true,
      title: true,
      attributes: true,
      category: { select: { slug: true } },
      orderItems: { select: { id: true }, take: 1 },
    },
  });

  const ids: string[] = [];
  for (const p of active) {
    const junk = isJunkTitle(p.title);
    const capture = hasFullCapture(p.category.slug, attrsFromJson(p.attributes), p.title);
    if (junk || !capture) {
      // Never hard-delete products that already have orders — hide instead.
      if (p.orderItems.length > 0) {
        await prisma.product.update({ where: { id: p.id }, data: { status: "unavailable" } });
      } else {
        ids.push(p.id);
      }
    }
  }

  if (ids.length) {
    await prisma.product.deleteMany({ where: { id: { in: ids } } });
  }

  invalidate("trending-");
  invalidate("newest-");
  invalidate("ai-products-");
  invalidate("cat-");
  return { deleted: ids.length, ids };
}

export async function runRule(
  ruleId: string,
): Promise<{ imported: number; updated: number; removed: number }> {
  const rule = await prisma.syncRule.findUnique({
    where: { id: ruleId },
    include: { category: true },
  });
  if (!rule || !rule.enabled) return { imported: 0, updated: 0, removed: 0 };

  const supplier = getSupplier("lzt");
  if (!supplier || !supplier.isConfigured()) return { imported: 0, updated: 0, removed: 0 };

  if (!isValidLztCategory(rule.supplierCategory)) {
    throw new Error(
      `Invalid supplier category "${rule.supplierCategory}" for rule "${rule.name}". ` +
        `Valid categories: ${LZT_CATEGORIES.join(", ")}.`,
    );
  }

  const filter: RuleFilter = {
    keywords: asStringArray(rule.keywords),
    whitelist: asStringArray(rule.whitelist),
    blacklist: asStringArray(rule.blacklist),
    maxImport: rule.maxImport,
  };

  const collected: SupplierListing[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= 25 && collected.length < filter.maxImport; page++) {
    const batch = await supplier.listItems({
      supplierCategory: rule.supplierCategory,
      minSellerRating: rule.minSellerRating ?? undefined,
      minPrice: rule.minSupplierPrice ?? undefined,
      maxPrice: rule.maxSupplierPrice ?? undefined,
      country: rule.country ?? undefined,
      autoDeliveryOnly: rule.autoDeliveryOnly,
      page,
    });
    if (batch.length === 0) break;
    for (const item of batch) {
      if (!seen.has(item.supplierItemId) && passesTextFilters(item, filter)) {
        seen.add(item.supplierItemId);
        collected.push(item);
      }
    }
  }
  const listings = collected.slice(0, filter.maxImport);

  const supplierRow = await prisma.supplier.upsert({
    where: { slug: supplier.slug },
    update: {},
    create: { slug: supplier.slug, name: supplier.name },
  });

  let imported = 0;
  let updated = 0;

  const asJson = (v: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined =>
    v === undefined ? undefined : (v as Prisma.InputJsonValue);

  const a = (listing: (typeof listings)[number]) => {
    const at = (listing.attributes ?? {}) as Record<string, unknown>;
    return {
      country: typeof at.country === "string" ? at.country : null,
      emailNative: at.emailNative === true,
      vac: at.vac === true,
      level: typeof at.level === "number" ? at.level : null,
      tags: Array.isArray(at.tags) ? (at.tags as Prisma.InputJsonValue) : undefined,
    };
  };

  const pricing = await resolveCategoryPricing(rule.categoryId);
  const keepSupplierIds = new Set<string>();

  for (const listing of listings) {
    keepSupplierIds.add(listing.supplierItemId);
    const price = applyPricing(listing.cost, pricing);
    const baseSlug = slugify(`${listing.title}-${listing.supplierItemId}`);
    const idx = a(listing);

    const existing = await prisma.product.findUnique({
      where: {
        supplierId_supplierItemId: {
          supplierId: supplierRow.id,
          supplierItemId: listing.supplierItemId,
        },
      },
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          title: listing.title,
          description: listing.description,
          price,
          cost: listing.cost,
          status: "active",
          attributes: asJson(listing.attributes ?? undefined),
          images: listing.images ? (listing.images as Prisma.InputJsonValue) : undefined,
          country: idx.country,
          emailNative: idx.emailNative,
          vac: idx.vac,
          level: idx.level,
          tags: idx.tags,
        },
      });
      updated++;
    } else {
      await prisma.product.create({
        data: {
          slug: baseSlug,
          title: listing.title,
          description: listing.description,
          price,
          cost: listing.cost,
          currency: listing.currency,
          deliveryType: listing.deliveryType,
          status: "active",
          stock: 1,
          attributes: asJson(listing.attributes ?? undefined),
          images: listing.images ? (listing.images as Prisma.InputJsonValue) : undefined,
          country: idx.country,
          emailNative: idx.emailNative,
          vac: idx.vac,
          level: idx.level,
          tags: idx.tags,
          supplierItemId: listing.supplierItemId,
          supplierId: supplierRow.id,
          categoryId: rule.categoryId,
        },
      });
      imported++;
    }
  }

  // Remove stale LZT products in this category that weren't in the fresh capture set.
  const stale = await prisma.product.findMany({
    where: {
      categoryId: rule.categoryId,
      supplierId: supplierRow.id,
      status: "active",
      sourceType: "lzt",
    },
    select: {
      id: true,
      title: true,
      supplierItemId: true,
      attributes: true,
      orderItems: { select: { id: true }, take: 1 },
    },
  });

  let removed = 0;
  const deleteIds: string[] = [];
  for (const p of stale) {
    const stillGood =
      p.supplierItemId &&
      keepSupplierIds.has(p.supplierItemId) &&
      !isJunkTitle(p.title) &&
      hasFullCapture(rule.category.slug, attrsFromJson(p.attributes), p.title);
    if (stillGood) continue;
    if (p.orderItems.length > 0) {
      await prisma.product.update({ where: { id: p.id }, data: { status: "unavailable" } });
      removed++;
    } else {
      deleteIds.push(p.id);
    }
  }
  if (deleteIds.length) {
    await prisma.product.deleteMany({ where: { id: { in: deleteIds } } });
    removed += deleteIds.length;
  }

  return { imported, updated, removed };
}

/** Run every enabled rule and record a SyncRun for the admin log. */
export async function runAllRules(): Promise<{
  imported: number;
  updated: number;
  removed: number;
  runId: string;
}> {
  const supplierRow = await prisma.supplier.upsert({
    where: { slug: "lzt" },
    update: {},
    create: { slug: "lzt", name: "LZT Market" },
  });

  const run = await prisma.syncRun.create({
    data: { supplierId: supplierRow.id, status: "running" },
  });

  try {
    // Global purge of valorant test / empty-capture junk first.
    const purged = await purgeBadProducts();

    const rules = await prisma.syncRule.findMany({ where: { enabled: true } });
    let imported = 0;
    let updated = 0;
    let removed = purged.deleted;
    for (const rule of rules) {
      const result = await runRule(rule.id);
      imported += result.imported;
      updated += result.updated;
      removed += result.removed;
    }
    await prisma.syncRun.update({
      where: { id: run.id },
      data: { status: "success", imported, updated, removed, finishedAt: new Date() },
    });
    invalidate("trending-");
    invalidate("newest-");
    invalidate("ai-products-");
    invalidate("cat-");
    try {
      const { recordActivity } = await import("@/lib/activity");
      const { discordEvent } = await import("@/lib/discord");
      if (imported > 0) {
        await recordActivity({
          type: "product_added",
          title: `${imported} new listings synced`,
          body: `Updated ${updated} · removed ${removed}`,
          href: "/marketplace",
        });
      }
      await discordEvent("Sync complete", `Imported ${imported}, updated ${updated}, removed ${removed}.`);
    } catch {
      /* best-effort */
    }
    return { imported, updated, removed, runId: run.id };
  } catch (err) {
    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        message: err instanceof Error ? err.message : "Unknown error",
        finishedAt: new Date(),
      },
    });
    throw err;
  }
}
