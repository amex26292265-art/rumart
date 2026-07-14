import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true, user: true },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-950">Orders</h1>
      <p className="mt-1 text-sm text-ink-500">Every order, its margin, and delivery status.</p>

      <div className="mt-6">
        {orders.length === 0 ? (
          <EmptyState title="No orders yet" description="Orders appear here as customers buy." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-mist-200 text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Profit</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-mist-100">
                    <td className="px-5 py-3 font-mono text-xs text-ink-600">{o.reference}</td>
                    <td className="px-5 py-3 text-ink-700">{o.user.email}</td>
                    <td className="px-5 py-3 text-ink-600">{o.items.length}</td>
                    <td className="px-5 py-3 font-medium text-ink-950">{formatMoney(o.total, o.currency)}</td>
                    <td className="px-5 py-3 text-emerald-600">{formatMoney(o.profit, o.currency)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={o.status === "completed" ? "success" : o.status === "failed" ? "danger" : "neutral"}>
                        {o.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-ink-400">{o.createdAt.toLocaleDateString()}</td>
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
