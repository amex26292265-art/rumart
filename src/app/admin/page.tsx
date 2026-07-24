import Link from "next/link";
import { DollarSign, TrendingUp, Receipt, Users, Package, Clock, Activity } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isSupplierConfigured, isPaymentsConfigured } from "@/lib/env";
import { getSupplier } from "@/lib/suppliers/registry";
import { Counter } from "@/components/ui/counter";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { WalletCredit } from "./WalletCredit";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    revenueAgg,
    orders,
    pendingOrders,
    customers,
    products,
    recent,
    lastSync,
    deposits7d,
    topProducts,
    pendingSellers,
    cronBeat,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { status: "completed" },
      _sum: { total: true, profit: true },
    }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "pending" } }),
    prisma.user.count({ where: { role: { in: ["customer", "seller"] } } }),
    prisma.product.count({ where: { status: "active" } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { items: true } }),
    prisma.syncRun.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.deposit.aggregate({
      where: { credited: true, createdAt: { gte: since } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.orderItem.groupBy({
      by: ["title"],
      _count: true,
      _sum: { price: true },
      orderBy: { _count: { title: "desc" } },
      take: 5,
    }),
    prisma.sellerApplication.count({ where: { status: "pending" } }),
    prisma.setting.findUnique({ where: { key: "cron_last_sync" } }),
  ]);

  const lztBalance = (await getSupplier("lzt")?.getBalance?.().catch(() => null)) ?? null;
  let dbOk = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbOk = false;
  }

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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-950">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-500">LZT</span>
          {lztBalance == null ? (
            <Badge tone="neutral">unknown</Badge>
          ) : (
            <Badge tone={lztBalance > 0 ? "success" : "danger"}>${lztBalance.toFixed(2)}</Badge>
          )}
          <span className="ml-2 text-ink-500">API</span>
          {isSupplierConfigured ? <Badge tone="success">Connected</Badge> : <Badge tone="warning">Off</Badge>}
          <span className="ml-2 text-ink-500">Pay</span>
          {isPaymentsConfigured ? <Badge tone="success">NOWPayments</Badge> : <Badge tone="warning">Off</Badge>}
        </div>
      </div>

      {lztBalance != null && lztBalance < 5 && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          LZT wallet is low (${lztBalance.toFixed(2)}). Paid orders above this fall to pending manual fulfillment.
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Health label="Database" ok={dbOk} detail={dbOk ? "Neon reachable" : "Query failed"} />
        <Health
          label="Cron sync"
          ok={Boolean(cronBeat?.value)}
          detail={cronBeat?.value ? `Last ${new Date(cronBeat.value).toLocaleString()}` : "No heartbeat yet"}
        />
        <Health
          label="Wallet deposits (7d)"
          ok
          detail={`${deposits7d._count} · ${formatMoney(deposits7d._sum.amount ?? 0)}`}
        />
        <Health
          label="Seller apps"
          ok={pendingSellers === 0}
          detail={pendingSellers ? `${pendingSellers} pending` : "None pending"}
          href="/admin/sellers"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-500/15 text-accent-400">
              <s.icon className="h-5 w-5" strokeWidth={1.7} />
            </span>
            <Counter
              value={Math.round(s.value)}
              money={s.money}
              className="mt-3 block font-display text-2xl font-bold text-ink-950"
            />
            <p className="mt-1 text-sm text-ink-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ink-950">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm font-medium text-accent-400">
              View all →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-500">No orders yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id} className="border-t border-mist-300">
                    <td className="py-3 font-mono text-xs text-ink-500">{o.reference}</td>
                    <td className="py-3 text-ink-700">{o.items.length} item(s)</td>
                    <td className="py-3 font-medium text-ink-950">{formatMoney(o.total, o.currency)}</td>
                    <td className="py-3 text-right">
                      <Badge tone={o.status === "completed" ? "success" : "warning"}>{o.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="mb-4 font-semibold text-ink-950">Last sync</h2>
            {lastSync ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-500">Status</span>
                  <Badge
                    tone={
                      lastSync.status === "success" ? "success" : lastSync.status === "failed" ? "danger" : "neutral"
                    }
                  >
                    {lastSync.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Imported</span>
                  <span className="font-medium">{lastSync.imported}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Updated</span>
                  <span className="font-medium">{lastSync.updated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">When</span>
                  <span className="font-medium">{lastSync.startedAt.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-ink-500">No sync has run yet.</p>
            )}
            <Link href="/admin/sync" className="mt-4 block text-center text-sm font-medium text-accent-400">
              Go to synchronization →
            </Link>
          </div>

          <div className="card p-6">
            <h2 className="mb-3 font-semibold text-ink-950">Top products</h2>
            {topProducts.length === 0 ? (
              <p className="text-sm text-ink-500">No sales yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {topProducts.map((t) => (
                  <li key={t.title} className="flex justify-between gap-2">
                    <span className="truncate text-ink-800">{t.title}</span>
                    <span className="shrink-0 text-ink-500">{t._count}×</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
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

function Health({
  label,
  ok,
  detail,
  href,
}: {
  label: string;
  ok: boolean;
  detail: string;
  href?: string;
}) {
  const inner = (
    <div className="card flex items-start gap-3 p-4">
      <Activity className={`mt-0.5 h-4 w-4 ${ok ? "text-emerald-400" : "text-amber-400"}`} />
      <div>
        <p className="text-sm font-semibold text-ink-950">{label}</p>
        <p className="text-xs text-ink-500">{detail}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
