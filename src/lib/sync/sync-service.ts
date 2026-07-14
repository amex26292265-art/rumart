import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSupplier } from "@/lib/suppliers/registry";
import { applyPricing, resolveCategoryPricing } from "@/lib/pricing/engine";
import { slugify } from "@/lib/utils";
import { LZT_CATEGORIES, isValidLztCategory } from "@/lib/suppliers/lzt/adapter";
import type { SupplierListing } from "@/lib/suppliers/types";

/**
 * Synchronization service. Runs configured sync rules against a supplier:
 *   import new listings → update prices/stock → remove unavailable ones.
 *
 * Runs inline today (callable from an admin API route). The structure — one
 * pure `runRule` per rule plus a `runAll` — maps directly onto a BullMQ worker
 * later: enqueue one job per rule, no code changes to the logic below.
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

export async function runRule(ruleId: string): Promise<{ imported: number; updated: number }> {
  const rule = await prisma.syncRule.findUnique({
    where: { id: ruleId },
    include: { category: true },
  });
  if (!rule || !rule.enabled) return { imported: 0, updated: 0 };

  const supplier = getSupplier("lzt");
  if (!supplier || !supplier.isConfigured()) return { imported: 0, updated: 0 };

  // Fail fast with a clear message on an invalid supplier category instead of a
  // cryptic upstream 404.
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

  // Page through the supplier until we have enough (LZT returns ~40 per page).
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
    if (batch.length === 0) break; // no more pages
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

  // Pull the indexable fields out of the parsed attributes.
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

  // Resolve pricing ONCE per rule run (not per item) for speed.
  const pricing = await resolveCategoryPricing(rule.categoryId);

  for (const listing of listings) {
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

  return { imported, updated };
}

/** Run every enabled rule and record a SyncRun for the admin log. */
export async function runAllRules(): Promise<{ imported: number; updated: number; runId: string }> {
  const supplierRow = await prisma.supplier.upsert({
    where: { slug: "lzt" },
    update: {},
    create: { slug: "lzt", name: "LZT Market" },
  });

  const run = await prisma.syncRun.create({
    data: { supplierId: supplierRow.id, status: "running" },
  });

  try {
    const rules = await prisma.syncRule.findMany({ where: { enabled: true } });
    let imported = 0;
    let updated = 0;
    for (const rule of rules) {
      const result = await runRule(rule.id);
      imported += result.imported;
      updated += result.updated;
    }
    await prisma.syncRun.update({
      where: { id: run.id },
      data: { status: "success", imported, updated, finishedAt: new Date() },
    });
    return { imported, updated, runId: run.id };
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
