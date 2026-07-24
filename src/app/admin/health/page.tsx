import Link from "next/link";
import {
  Activity,
  Cloud,
  Database,
  Radio,
  Server,
  Shield,
  Wallet,
  Webhook,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isPaymentsConfigured, isSupplierConfigured } from "@/lib/env";
import { getSupplier } from "@/lib/suppliers/registry";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
        ok
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-red-500/30 bg-red-500/10 text-red-300"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`} />
      {label}
    </span>
  );
}

export default async function AdminHealthPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || "";
  const type = sp.type?.trim() || "";

  let neonOk = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    neonOk = false;
  }

  const lztConfigured = isSupplierConfigured;
  const paymentsOk = isPaymentsConfigured;
  const lztBalance = lztConfigured
    ? await getSupplier("lzt")?.getBalance?.().catch(() => null)
    : null;

  const [lastSync, cronBeat, webhookSetting, recentAudit, recentActivity, syncRuns] =
    await Promise.all([
      prisma.syncRun.findFirst({ orderBy: { startedAt: "desc" } }),
      prisma.setting.findUnique({ where: { key: "cron_last_sync" } }),
      prisma.setting.findUnique({ where: { key: "discord_webhook_url" } }),
      prisma.auditLog.findMany({
        where: {
          ...(q
            ? {
                action: { contains: q, mode: "insensitive" },
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      prisma.activityEvent
        .findMany({
          where: {
            ...(type ? { type } : {}),
            ...(q
              ? {
                  OR: [
                    { title: { contains: q, mode: "insensitive" } },
                    { body: { contains: q, mode: "insensitive" } },
                  ],
                }
              : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 40,
        })
        .catch(() => []),
      prisma.syncRun.findMany({ orderBy: { startedAt: "desc" }, take: 12 }),
    ]);

  const cards = [
    { icon: Database, title: "Neon", ok: neonOk, detail: neonOk ? "Query OK" : "Unreachable" },
    {
      icon: Cloud,
      title: "Cloudflare",
      ok: true,
      detail: "Worker runtime (this page)",
    },
    {
      icon: Server,
      title: "LZT supplier",
      ok: lztConfigured && lztBalance != null,
      detail: lztConfigured
        ? lztBalance != null
          ? `Balance probe OK`
          : "Configured — balance probe failed"
        : "Not configured",
    },
    {
      icon: Wallet,
      title: "NOWPayments",
      ok: paymentsOk,
      detail: paymentsOk ? "Keys present" : "Missing keys",
    },
    {
      icon: Webhook,
      title: "Discord webhook",
      ok: Boolean(webhookSetting?.value || process.env.DISCORD_WEBHOOK_URL),
      detail: webhookSetting?.value || process.env.DISCORD_WEBHOOK_URL ? "Configured" : "Not set",
    },
    {
      icon: Radio,
      title: "Cron heartbeat",
      ok: Boolean(cronBeat?.value),
      detail: cronBeat?.value ? `Last: ${cronBeat.value}` : "No heartbeat yet",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-950">System health</h1>
        <p className="mt-1 text-sm text-ink-500">
          Live status for Neon, Cloudflare, LZT, payments, webhooks, and searchable ops logs.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className="rounded-2xl border border-mist-300/70 bg-mist-100 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-ink-950">
                <c.icon className="h-4 w-4 text-accent-400" />
                {c.title}
              </div>
              <StatusPill ok={c.ok} label={c.ok ? "OK" : "Check"} />
            </div>
            <p className="mt-2 text-xs text-ink-500">{c.detail}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-mist-300/70 bg-mist-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-950">
            <Activity className="h-4 w-4 text-accent-400" /> Searchable logs
          </h2>
          <form className="flex flex-wrap gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search audit / activity…"
              className="field !w-56"
            />
            <select name="type" defaultValue={type} className="field !w-40">
              <option value="">All activity types</option>
              {[
                "product_added",
                "product_sold",
                "seller_joined",
                "forum_topic",
                "review",
                "announcement",
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-xl bg-accent-600 px-3 py-2 text-sm text-white">
              Filter
            </button>
          </form>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-800">Audit log</h3>
            <ul className="max-h-80 space-y-2 overflow-y-auto text-xs">
              {recentAudit.map((a) => (
                <li key={a.id} className="rounded-lg border border-mist-300/60 bg-mist-50 px-3 py-2">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-ink-950">{a.action}</span>
                    <time className="text-ink-400">{a.createdAt.toLocaleString()}</time>
                  </div>
                  {a.meta && (
                    <p className="mt-1 truncate text-ink-500">
                      {typeof a.meta === "string" ? a.meta : JSON.stringify(a.meta)}
                    </p>
                  )}
                </li>
              ))}
              {!recentAudit.length && <li className="text-ink-500">No audit rows.</li>}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink-800">Activity feed</h3>
            <ul className="max-h-80 space-y-2 overflow-y-auto text-xs">
              {recentActivity.map((a) => (
                <li key={a.id} className="rounded-lg border border-mist-300/60 bg-mist-50 px-3 py-2">
                  <div className="flex justify-between gap-2">
                    <Badge className="!text-[0.6rem]">{a.type}</Badge>
                    <time className="text-ink-400">{a.createdAt.toLocaleString()}</time>
                  </div>
                  <p className="mt-1 font-medium text-ink-950">{a.title}</p>
                </li>
              ))}
              {!recentActivity.length && <li className="text-ink-500">No activity rows yet.</li>}
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-mist-300/70 bg-mist-100 p-4">
        <h2 className="font-display text-lg font-semibold text-ink-950">Recent sync runs</h2>
        <p className="mt-1 text-xs text-ink-500">
          Last run: {lastSync ? `${lastSync.status} · ${lastSync.startedAt.toLocaleString()}` : "none"}
        </p>
        <ul className="mt-4 space-y-2 text-xs">
          {syncRuns.map((r) => (
            <li key={r.id} className="flex justify-between gap-3 rounded-lg border border-mist-300/50 px-3 py-2">
              <span className="text-ink-800">
                {r.status} · imported {r.imported ?? 0} · updated {r.updated ?? 0}
              </span>
              <time className="text-ink-400">{r.startedAt.toLocaleString()}</time>
            </li>
          ))}
        </ul>
        <Link href="/admin/sync" className="mt-4 inline-block text-sm text-accent-400 hover:underline">
          Open sync console →
        </Link>
      </div>

      <div className="rounded-2xl border border-mist-300/70 bg-mist-100 p-4 text-sm text-ink-600">
        <div className="flex items-center gap-2 font-medium text-ink-950">
          <Shield className="h-4 w-4 text-accent-400" /> Security notes
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
          <li>Set `discord_webhook_url` in Settings (or DISCORD_WEBHOOK_URL secret) for ops alerts.</li>
          <li>LZT credentials stay server-side — never exposed to customers.</li>
          <li>Migrate V3 tables via `/api/admin/migrate-schema` with MIGRATE_SECRET.</li>
        </ul>
      </div>
    </div>
  );
}
