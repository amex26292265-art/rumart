import { prisma } from "@/lib/prisma";
import { isSupplierConfigured } from "@/lib/env";
import { Badge } from "@/components/ui/badge";
import { LZT_CATEGORIES } from "@/lib/suppliers/lzt/adapter";
import { toggleSyncRule } from "@/app/actions/admin";
import { SyncRunner } from "./SyncRunner";
import { RuleForm } from "./RuleForm";
import { GenerateRulesButton } from "./GenerateRulesButton";

export const dynamic = "force-dynamic";

export default async function AdminSyncPage() {
  const [rules, runs, categories] = await Promise.all([
    prisma.syncRule.findMany({ include: { category: true }, orderBy: { createdAt: "asc" } }),
    prisma.syncRun.findMany({ orderBy: { startedAt: "desc" }, take: 10 }),
    prisma.category.findMany({ orderBy: { order: "asc" } }),
  ]);

  const supplierCategories = [...LZT_CATEGORIES].sort();
  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-950">Synchronization</h1>
          <p className="mt-1 text-sm text-ink-500">
            Products are added here: create a rule for a category, then run sync to import real listings.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <GenerateRulesButton />
          <SyncRunner configured={isSupplierConfigured} />
        </div>
      </div>

      {/* Add a new rule */}
      <div className="card mb-6 overflow-hidden">
        <div className="border-b border-mist-200 px-5 py-3 text-sm font-semibold text-ink-950">
          Add products — new sync rule
        </div>
        <RuleForm rule={{}} categories={categoryOptions} supplierCategories={supplierCategories} isNew />
      </div>

      {/* Existing rules (expand to edit) */}
      <div className="card overflow-hidden">
        <div className="border-b border-mist-200 px-5 py-3 text-sm font-semibold text-ink-950">
          Sync rules ({rules.length})
        </div>
        {rules.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-400">No rules yet — create one above.</p>
        ) : (
          <div className="divide-y divide-mist-100">
            {rules.map((r) => (
              <details key={r.id} className="group">
                <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-3 text-sm hover:bg-mist-50">
                  <span className="font-medium text-ink-950">{r.name}</span>
                  <span className="text-ink-500">{r.category.name}</span>
                  <span className="text-ink-400">· {r.supplierCategory}</span>
                  <span className="text-ink-400">· ≤ {r.maxSupplierPrice ? `$${r.maxSupplierPrice}` : "any"}</span>
                  <span className="text-ink-400">· up to {r.maxImport}</span>
                  <span className="ml-auto flex items-center gap-3">
                    <form action={toggleSyncRule}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit">
                        <Badge tone={r.enabled ? "success" : "neutral"}>{r.enabled ? "Enabled" : "Disabled"}</Badge>
                      </button>
                    </form>
                    <span className="text-xs text-ink-400 group-open:hidden">Edit ▾</span>
                  </span>
                </summary>
                <div className="border-t border-mist-100 bg-mist-50">
                  <RuleForm
                    rule={{
                      id: r.id,
                      name: r.name,
                      categoryId: r.categoryId,
                      supplierCategory: r.supplierCategory,
                      maxSupplierPrice: r.maxSupplierPrice,
                      minSupplierPrice: r.minSupplierPrice,
                      country: r.country,
                      maxImport: r.maxImport,
                      enabled: r.enabled,
                    }}
                    categories={categoryOptions}
                    supplierCategories={supplierCategories}
                  />
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      {/* Run log */}
      <div className="card mt-6 overflow-hidden">
        <div className="border-b border-mist-200 px-5 py-3 text-sm font-semibold text-ink-950">Run history</div>
        {runs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-400">No runs yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-mist-100">
                  <td className="px-5 py-3 text-ink-600">{run.startedAt.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <Badge tone={run.status === "success" ? "success" : run.status === "failed" ? "danger" : "neutral"}>
                      {run.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-ink-600">+{run.imported} imported</td>
                  <td className="px-5 py-3 text-ink-600">{run.updated} updated</td>
                  <td className="px-5 py-3 text-ink-400">{run.message ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
