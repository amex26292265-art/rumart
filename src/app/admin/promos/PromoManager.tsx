"use client";

import { useState, useTransition } from "react";
import { savePromoCode } from "@/app/actions/admin";

export function NewPromoForm() {
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) => {
        setMsg(null);
        start(async () => {
          const res = await savePromoCode(fd);
          setOk(res.ok);
          setMsg(res.ok ? "Saved ✓" : res.error);
        });
      }}
      className="card space-y-3 p-6"
    >
      <h2 className="font-semibold text-ink-950">New / update code</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-ink-400">Code</label>
          <input name="code" placeholder="LAUNCH10" className="field uppercase" required />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-ink-400">Type</label>
          <select name="type" className="field">
            <option value="percent">Percent (%)</option>
            <option value="flat">Flat ($)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-ink-400">Value</label>
          <input name="value" type="number" step="0.01" min="0" placeholder="10" className="field" required />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-ink-400">Max total uses (blank = ∞)</label>
          <input name="maxUses" type="number" min="1" placeholder="500" className="field" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-ink-400">Uses per customer</label>
          <input name="perUser" type="number" min="1" defaultValue="1" className="field" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-ink-400">Min order $ (optional)</label>
          <input name="minOrder" type="number" step="0.01" min="0" className="field" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-ink-400">Max discount $ (percent cap)</label>
          <input name="maxDiscount" type="number" step="0.01" min="0" className="field" />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink-700">
          <input name="active" type="checkbox" defaultChecked /> Active
        </label>
      </div>
      <button
        disabled={pending}
        className="rounded-lg bg-ink-950 px-4 py-2 text-sm font-medium text-white hover:bg-ink-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save code"}
      </button>
      {msg && <span className={`ml-3 text-xs ${ok ? "text-emerald-600" : "text-red-600"}`}>{msg}</span>}
    </form>
  );
}
