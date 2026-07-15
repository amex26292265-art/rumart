"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { fulfillOrderManually, refundOrder } from "@/app/actions/admin";

export interface AdminOrder {
  reference: string;
  email: string;
  itemCount: number;
  itemTitle: string;
  total: number;
  profit: number;
  currency: string;
  status: string;
  date: string;
}

export function OrderRow({ order }: { order: AdminOrder }) {
  const [open, setOpen] = useState(false);
  const [creds, setCreds] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const canAct = order.status !== "completed" && order.status !== "refunded";

  const fulfill = () => {
    setMsg(null);
    start(async () => {
      const fd = new FormData();
      fd.set("reference", order.reference);
      fd.set("credentials", creds);
      const res = await fulfillOrderManually(fd);
      setMsg(res.ok ? "Delivered ✓" : res.error);
      if (res.ok) setOpen(false);
    });
  };

  const refund = () => {
    if (!confirm(`Refund order ${order.reference} to the customer's wallet?`)) return;
    setMsg(null);
    start(async () => {
      const fd = new FormData();
      fd.set("reference", order.reference);
      const res = await refundOrder(fd);
      setMsg(res.ok ? "Refunded ✓" : res.error);
    });
  };

  return (
    <>
      <tr className="border-b border-mist-100">
        <td className="px-5 py-3 font-mono text-xs text-ink-600">{order.reference}</td>
        <td className="px-5 py-3 text-ink-700">{order.email}</td>
        <td className="px-5 py-3 text-ink-600" title={order.itemTitle}>
          {order.itemCount}
        </td>
        <td className="px-5 py-3 font-medium text-ink-950">{formatMoney(order.total, order.currency)}</td>
        <td className="px-5 py-3 text-emerald-600">{formatMoney(order.profit, order.currency)}</td>
        <td className="px-5 py-3">
          <Badge
            tone={
              order.status === "completed"
                ? "success"
                : order.status === "failed" || order.status === "refunded"
                  ? "danger"
                  : "warning"
            }
          >
            {order.status}
          </Badge>
        </td>
        <td className="px-5 py-3 text-ink-400">{order.date}</td>
        <td className="px-5 py-3 text-right">
          {canAct && (
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen((v) => !v)}
                className="rounded-md bg-ink-950 px-2.5 py-1 text-xs font-medium text-white hover:bg-ink-800"
              >
                Deliver
              </button>
              <button
                onClick={refund}
                disabled={pending}
                className="rounded-md border border-mist-300 px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-red-300 hover:text-red-600"
              >
                Refund
              </button>
            </div>
          )}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-mist-100 bg-mist-50">
          <td colSpan={8} className="px-5 py-4">
            <label className="mb-1 block text-[11px] font-semibold text-ink-400">
              Credentials for {order.itemTitle} (delivered encrypted to the customer)
            </label>
            <textarea
              value={creds}
              onChange={(e) => setCreds(e.target.value)}
              rows={3}
              placeholder={"Login: ...\nPassword: ...\nEmail: ..."}
              className="field font-mono text-xs"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={fulfill}
                disabled={pending || !creds.trim()}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {pending ? "Delivering…" : "Deliver & complete"}
              </button>
              {msg && <span className="text-xs text-ink-600">{msg}</span>}
            </div>
          </td>
        </tr>
      )}
      {msg && !open && (
        <tr>
          <td colSpan={8} className="px-5 pb-2 text-right text-xs text-ink-500">
            {msg}
          </td>
        </tr>
      )}
    </>
  );
}
