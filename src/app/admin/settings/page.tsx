import { isSupplierConfigured, env } from "@/lib/env";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSiteSettings } from "@/lib/site-settings";
import { saveSiteSettings } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  const rows = [
    { label: "Supplier API (LZT)", value: isSupplierConfigured ? "Connected" : "Not configured", ok: isSupplierConfigured },
    { label: "API base", value: env.LZT_API_BASE, ok: true },
    { label: "Site currency", value: env.SITE_CURRENCY, ok: true },
    { label: "Redis / BullMQ", value: env.REDIS_URL ? "Configured" : "Inline (no queue)", ok: true },
    { label: "Secrets encryption", value: "AES-256-GCM active", ok: true },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-950">Settings</h1>
      <p className="mt-1 text-sm text-ink-500">Manage your storefront contact details and see system status.</p>

      {/* Editable contact / Telegram settings */}
      <form action={saveSiteSettings} className="card mt-6 space-y-4 p-6">
        <h2 className="font-semibold text-ink-950">Contact & branding</h2>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-ink-400">Telegram username (without @)</label>
          <input name="telegramHandle" defaultValue={settings.telegramHandle} placeholder="rumart_support" className="field" />
          <p className="mt-1 text-xs text-ink-400">
            Buyers are sent here (t.me/{settings.telegramHandle}) when auto-delivery needs a manual step.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-ink-400">Support note (shown on the manual-delivery screen)</label>
          <textarea name="supportNote" defaultValue={settings.supportNote} rows={2} className="field" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-ink-400">Homepage tagline</label>
          <input name="brandTagline" defaultValue={settings.brandTagline} className="field" />
        </div>
        <Button size="sm">Save settings</Button>
      </form>

      {/* System status */}
      <div className="card mt-6 divide-y divide-mist-200">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-ink-600">{r.label}</span>
            <Badge tone={r.ok ? "success" : "warning"}>{r.value}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
