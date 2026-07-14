import { prisma } from "@/lib/prisma";

export interface PricingRuleInput {
  type: string; // percent | flat
  value: number;
  minMargin?: number | null;
  maxMargin?: number | null;
  rounding?: string; // none | up_99 | up_int
}

/**
 * Apply a single pricing rule to a supplier cost, returning the sell price.
 * Margin caps guarantee we never sell below cost + minMargin, nor add more
 * than maxMargin above cost.
 */
export function applyPricing(cost: number, rule: PricingRuleInput): number {
  let margin = rule.type === "flat" ? rule.value : (cost * rule.value) / 100;

  if (rule.minMargin != null) margin = Math.max(margin, rule.minMargin);
  if (rule.maxMargin != null) margin = Math.min(margin, rule.maxMargin);

  let price = cost + margin;

  switch (rule.rounding) {
    case "up_int":
      price = Math.ceil(price);
      break;
    case "up_99":
      price = Math.ceil(price) - 0.01;
      break;
    default:
      price = Math.round(price * 100) / 100;
  }
  return Math.max(price, cost); // never below cost
}

/**
 * Resolve the effective sell price for a cost in a given category, using the
 * highest-priority enabled category rule, falling back to the global rule.
 */
export async function priceForCategory(cost: number, categoryId: string): Promise<number> {
  const rule = await resolveCategoryPricing(categoryId);
  return applyPricing(cost, rule);
}

const DEFAULT_RULE: PricingRuleInput = { type: "percent", value: 25, rounding: "none" };

/**
 * Resolve the effective pricing rule for a category ONCE (category rule beats
 * global). Sync resolves this per rule-run instead of per item, so importing
 * thousands of products doesn't hammer the DB with pricing queries.
 */
export async function resolveCategoryPricing(categoryId: string): Promise<PricingRuleInput> {
  const [categoryRule, globalRule] = await Promise.all([
    prisma.pricingRule.findFirst({ where: { categoryId, enabled: true }, orderBy: { priority: "desc" } }),
    prisma.pricingRule.findFirst({ where: { categoryId: null, enabled: true }, orderBy: { priority: "desc" } }),
  ]);
  return categoryRule ?? globalRule ?? DEFAULT_RULE;
}
