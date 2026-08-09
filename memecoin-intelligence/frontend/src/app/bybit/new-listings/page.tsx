"use client";

import { useEffect, useState } from "react";
import { OpportunityRow } from "@/components/ui/OpportunityRow";
import { BybitFeature, apiGet } from "@/lib/api";

export default function NewListingsPage() {
  const [items, setItems] = useState<BybitFeature[]>([]);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      apiGet<{ items: BybitFeature[]; note?: string }>("/bybit/new-listings").then((d) => {
        setItems(d.items || []);
        setNote(d.note || null);
      });
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">🆕 New Bybit Listings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Requires official instruments `launchTime`. If Bybit REST is unavailable, this feed stays empty rather than inventing ages.
        </p>
      </div>
      {note && <div className="card border-amber-500/30 p-3 text-sm text-amber-100">{note}</div>}
      <div className="space-y-2">
        {items.map((item, i) => (
          <OpportunityRow key={item.symbol} item={item} rank={i + 1} />
        ))}
        {!items.length && !note && <div className="text-sm text-slate-400">No new listings with known launch times.</div>}
      </div>
    </div>
  );
}
