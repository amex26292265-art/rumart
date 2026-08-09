"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

export default function AlertsPage() {
  const [items, setItems] = useState<unknown[]>([]);
  const [note, setNote] = useState("");
  useEffect(() => {
    apiGet<{ items: unknown[]; note?: string }>("/alerts").then((d) => {
      setItems(d.items || []);
      setNote(d.note || "");
    });
  }, []);
  return (
    <div className="card p-5">
      <h1 className="text-xl font-semibold">Alert Center</h1>
      <p className="mt-2 text-sm text-slate-400">{note || "No alerts yet."}</p>
      <pre className="mt-4 text-xs text-slate-500">{JSON.stringify(items, null, 2)}</pre>
    </div>
  );
}
