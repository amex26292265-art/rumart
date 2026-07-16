import Link from "next/link";
import { DollarSign, TrendingUp, Receipt, Users, Package, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isSupplierConfigured } from "@/lib/env";
import { getSupplier } from "@/lib/suppliers/registry";
import { Counter } from "@/components/ui/counter";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { WalletCredit } from "./WalletCredit";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [revenueAgg, orders, pendingOrders, customers, products, recent, lastSync] = await Promise.all([
    prisma.order.aggregate({
      where: { status: "completed" },
      _sum: { total: true, profit: true },
    }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "pending" } }),
    prisma.user.count({ where: { role: "customer" } }),
    prisma.product.count({ where: { status: "active" } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { items: true } }),
    prisma.syncRun.findFirst({ orderBy: { startedAt: "desc" } }),
  ]);

  // Live LZT wallet balance — auto-delivery only works when this covers costs.
  const lztBalance = await getSupplier("lzt")?.getBalance?.().catch(() => null) ?? null;

  const revenue = revenueAgg._sum.total ?? 0;
  const profit = revenueAgg._sum.profit ?? 0;

  const stats = [
    { label: "Revenue", value: revenue, money: true, icon: DollarSign },
    { label: "Profit", value: profit, money: true, icon: TrendingUp },
    { label: "Orders", value: orders, icon: Receipt },
    { label: "Customers", value: customers, icon: Users },
    { label: "Live products", value: products, icon: Package },
    { label: "Pending orders", value: pendingOrders, icon: Clock },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-950">Dashboard</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-ink-500">LZT balance</span>
          {lztBalance == null ? (
            <Badge tone="neutral">unknown</Badge>
          ) : (
            <Badge tone={lztBalance > 0 ? "success" : "danger"}>${lztBalance.toFixed(2)}</Badge>
          )}
          <span className="ml-3 text-ink-500">Supplier API</span>
          {isSupplierConfigured ? <Badge tone="success">Connected</Badge> : <Badge tone="warning">Not configured</Badge>}
        </div>
      </div>
      {lztBalance != null && lztBalance < 5 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your LZT wallet balance is low (${lztBalance.toFixed(2)}). Paid orders above this will be kept as
          <span className="font-medium"> pending manual fulfillment</span> until you top up LZT.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-mist-100 text-ink-700">
                <s.icon className="h-5 w-5" strokeWidth={1.7} />
              </span>
            </div>
            <Counter
              value={Math.round(s.value)}
              money={s.money}
              className="mt-3 block text-2xl font-semibold text-ink-950"
            />
            <p className="mt-1 text-sm text-ink-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ink-950">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm font-medium text-accent-600">View all →</Link>
          </div>
          {recent.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-400">No orders yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id} className="border-t border-mist-200">
                    <td className="py-3 font-mono text-xs text-ink-500">{o.reference}</td>
                    <td className="py-3 text-ink-700">{o.items.length} item(s)</td>
                    <td className="py-3 font-medium text-ink-950">{formatMoney(o.total, o.currency)}</td>
                    <td className="py-3 text-right">
                      <Badge tone={o.status === "completed" ? "success" : "neutral"}>{o.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card p-6">
          <h2 className="mb-4 font-semibold text-ink-950">Last sync</h2>
          {lastSync ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-500">Status</span>
                <Badge tone={lastSync.status === "success" ? "success" : lastSync.status === "failed" ? "danger" : "neutral"}>
                  {lastSync.status}
                </Badge>
              </div>
              <div className="flex justify-between"><span className="text-ink-500">Imported</span><span className="font-medium">{lastSync.imported}</span></div>
              <div className="flex justify-between"><span className="text-ink-500">Updated</span><span className="font-medium">{lastSync.updated}</span></div>
              <div className="flex justify-between"><span className="text-ink-500">When</span><span className="font-medium">{lastSync.startedAt.toLocaleString()}</span></div>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-ink-400">No sync has run yet.</p>
          )}
          <Link href="/admin/sync" className="mt-4 block text-center text-sm font-medium text-accent-600">
            Go to synchronization →
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <WalletCredit />
        </div>
      </div>
    </div>
  );
}
