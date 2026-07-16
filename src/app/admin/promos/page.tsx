import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { togglePromoCode, deletePromoCode } from "@/app/actions/admin";
import { NewPromoForm } from "./PromoManager";

export const dynamic = "force-dynamic";

export default async function AdminPromosPage() {
  const codes = await prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-950">Promo codes</h1>
      <p className="mt-1 text-sm text-ink-500">Discounts applied at checkout, deducted from the customer’s total.</p>

      <div className="mt-6">
        <NewPromoForm />
      </div>

      <div className="mt-6">
        {codes.length === 0 ? (
          <EmptyState title="No codes yet" description="Create one above (e.g. LAUNCH10)." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-mist-200 text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Discount</th>
                  <th className="px-5 py-3">Used</th>
                  <th className="px-5 py-3">Per user</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id} className="border-b border-mist-100">
                    <td className="px-5 py-3 font-mono font-medium text-ink-950">{c.code}</td>
                    <td className="px-5 py-3 text-ink-700">
                      {c.type === "percent" ? `${c.value}%` : `$${c.value.toFixed(2)}`}
                      {c.maxDiscount ? ` (max $${c.maxDiscount.toFixed(2)})` : ""}
                    </td>
                    <td className="px-5 py-3 text-ink-600">
                      {c.uses}
                      {c.maxUses ? ` / ${c.maxUses}` : ""}
                    </td>
                    <td className="px-5 py-3 text-ink-600">{c.perUser}</td>
                    <td className="px-5 py-3">
                      <Badge tone={c.active ? "success" : "neutral"}>{c.active ? "active" : "off"}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <form action={togglePromoCode}>
                          <input type="hidden" name="id" value={c.id} />
                          <button className="rounded-md border border-mist-300 px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-ink-400">
                            {c.active ? "Disable" : "Enable"}
                          </button>
                        </form>
                        <form action={deletePromoCode}>
                          <input type="hidden" name="id" value={c.id} />
                          <button className="rounded-md border border-mist-300 px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-red-300 hover:text-red-600">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
