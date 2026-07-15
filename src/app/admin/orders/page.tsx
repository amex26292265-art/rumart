import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderRow, type AdminOrder } from "./OrderRow";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true, user: true },
    take: 100,
  });

  const pendingCount = orders.filter((o) => o.status === "pending").length;

  const rows: AdminOrder[] = orders.map((o) => ({
    reference: o.reference,
    email: o.user.email,
    itemCount: o.items.length,
    itemTitle: o.items[0]?.title ?? "—",
    total: o.total,
    profit: o.profit,
    currency: o.currency,
    status: o.status,
    date: o.createdAt.toLocaleDateString(),
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-950">Orders</h1>
      <p className="mt-1 text-sm text-ink-500">
        Every order, its margin, and delivery status.
        {pendingCount > 0 && (
          <span className="ml-2 font-medium text-amber-600">{pendingCount} awaiting manual delivery</span>
        )}
      </p>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState title="No orders yet" description="Orders appear here as customers buy." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-mist-200 text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Profit</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <OrderRow key={o.reference} order={o} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
