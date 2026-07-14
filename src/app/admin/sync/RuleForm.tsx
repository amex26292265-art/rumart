import { Button } from "@/components/ui/button";
import { saveSyncRule, deleteSyncRule } from "@/app/actions/admin";

export interface RuleFormRule {
  id?: string;
  name?: string;
  categoryId?: string;
  supplierCategory?: string;
  maxSupplierPrice?: number | null;
  minSupplierPrice?: number | null;
  country?: string | null;
  maxImport?: number;
  enabled?: boolean;
}

/**
 * Create / edit a sync rule. Adding products = creating a rule for a category
 * with price/country filters, then running sync. Works for both new and
 * existing rules via the shared `saveSyncRule` server action.
 */
export function RuleForm({
  rule,
  categories,
  supplierCategories,
  isNew = false,
}: {
  rule: RuleFormRule;
  categories: { id: string; name: string }[];
  supplierCategories: string[];
  isNew?: boolean;
}) {
  return (
    <form action={saveSyncRule} className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
      {rule.id && <input type="hidden" name="id" value={rule.id} />}

      <div className="lg:col-span-2">
        <label className="mb-1 block text-[11px] font-semibold text-ink-400">Rule name</label>
        <input name="name" defaultValue={rule.name} required placeholder="e.g. Cheap Steam accounts" className="field" />
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold text-ink-400">Storefront category</label>
        <select name="categoryId" defaultValue={rule.categoryId ?? ""} className="field" required>
          <option value="" disabled>Choose…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold text-ink-400">Supplier category</label>
        <select name="supplierCategory" defaultValue={rule.supplierCategory ?? ""} className="field" required>
          <option value="" disabled>Choose…</option>
          {supplierCategories.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold text-ink-400">Min price ($)</label>
        <input name="minSupplierPrice" type="number" step="0.01" min="0" defaultValue={rule.minSupplierPrice ?? ""} className="field" />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold text-ink-400">Max price ($)</label>
        <input name="maxSupplierPrice" type="number" step="0.01" min="0" defaultValue={rule.maxSupplierPrice ?? ""} className="field" />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold text-ink-400">Country (optional)</label>
        <input name="country" defaultValue={rule.country ?? ""} placeholder="e.g. US" className="field" />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-semibold text-ink-400">Max to import</label>
        <input name="maxImport" type="number" min="1" defaultValue={rule.maxImport ?? 30} className="field" />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-600">
        <input type="checkbox" name="enabled" defaultChecked={rule.enabled ?? true} className="accent-accent-500" />
        Enabled
      </label>

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <Button size="sm" variant={isNew ? "accent" : "primary"}>
          {isNew ? "Create rule" : "Save changes"}
        </Button>
        {rule.id && (
          <Button size="sm" variant="ghost" formAction={deleteSyncRule} className="text-red-500">
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
