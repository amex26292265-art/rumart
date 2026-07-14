import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { savePricingRule, deletePricingRule } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  const [rules, categories] = await Promise.all([
    prisma.pricingRule.findMany({ include: { category: true }, orderBy: [{ priority: "desc" }] }),
    prisma.category.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-950">Pricing</h1>
      <p className="mt-1 text-sm text-ink-500">
        Automatic markup applied to every supplier cost. Category rules override the global rule.
      </p>

      <div className="mt-6 space-y-3">
        {rules.map((r) => (
          <form key={r.id} action={savePricingRule} className="card flex flex-wrap items-end gap-3 p-4">
            <input type="hidden" name="id" value={r.id} />
            <div className="min-w-40 flex-1">
              <label className="mb-1 block text-[11px] font-semibold text-ink-400">Name</label>
              <input name="name" defaultValue={r.name} className="field" />
            </div>
            <div className="w-40">
              <label className="mb-1 block text-[11px] font-semibold text-ink-400">Scope</label>
              <select name="categoryId" defaultValue={r.categoryId ?? ""} className="field">
                <option value="">Global</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="w-28">
              <label className="mb-1 block text-[11px] font-semibold text-ink-400">Type</label>
              <select name="type" defaultValue={r.type} className="field">
                <option value="percent">Percent</option>
                <option value="flat">Flat</option>
              </select>
            </div>
            <div className="w-24">
              <label className="mb-1 block text-[11px] font-semibold text-ink-400">Value</label>
              <input name="value" type="number" step="0.01" defaultValue={r.value} className="field" />
            </div>
            <div className="w-24">
              <label className="mb-1 block text-[11px] font-semibold text-ink-400">Min margin</label>
              <input name="minMargin" type="number" step="0.01" defaultValue={r.minMargin ?? ""} className="field" />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-[11px] font-semibold text-ink-400">Rounding</label>
              <select name="rounding" defaultValue={r.rounding} className="field">
                <option value="none">None</option>
                <option value="up_99">.99</option>
                <option value="up_int">Whole</option>
              </select>
            </div>
            <label className="flex items-center gap-2 pb-2.5 text-xs text-ink-600">
              <input type="checkbox" name="enabled" defaultChecked={r.enabled} className="accent-accent-500" /> Enabled
            </label>
            <Button size="sm">Save</Button>
            <Button size="sm" variant="ghost" formAction={deletePricingRule} className="text-red-500">Delete</Button>
          </form>
        ))}
      </div>

      {/* New rule */}
      <form action={savePricingRule} className="card mt-6 flex flex-wrap items-end gap-3 border-dashed p-4">
        <div className="min-w-40 flex-1">
          <label className="mb-1 block text-[11px] font-semibold text-ink-400">Name</label>
          <input name="name" required placeholder="New rule" className="field" />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-[11px] font-semibold text-ink-400">Scope</label>
          <select name="categoryId" className="field">
            <option value="">Global</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="w-28">
          <label className="mb-1 block text-[11px] font-semibold text-ink-400">Type</label>
          <select name="type" className="field">
            <option value="percent">Percent</option>
            <option value="flat">Flat</option>
          </select>
        </div>
        <div className="w-24">
          <label className="mb-1 block text-[11px] font-semibold text-ink-400">Value</label>
          <input name="value" type="number" step="0.01" defaultValue={25} className="field" />
        </div>
        <input type="hidden" name="enabled" value="true" />
        <Button size="sm" variant="accent">Add rule</Button>
      </form>

      <p className="mt-4 text-xs text-ink-400">
        Example: cost $5 with a +25% percent rule → sell $6.25 (or $6.99 with .99 rounding).
      </p>
    </div>
  );
}
