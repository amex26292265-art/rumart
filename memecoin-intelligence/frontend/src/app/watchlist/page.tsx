"use client";

import { useEffect, useState } from "react";
import { OpportunityRow } from "@/components/ui/OpportunityRow";
import { BybitFeature, apiGet } from "@/lib/api";

export default function WatchlistPage() {
  const [items, setItems] = useState<BybitFeature[]>([]);
  useEffect(() => {
    const load = () => apiGet<{ items: BybitFeature[] }>("/watchlist").then((d) => setItems(d.items || []));
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Watchlist</h1>
      {items.map((item, i) => (
        <OpportunityRow key={item.symbol} item={item} rank={i + 1} />
      ))}
      {!items.length && <div className="text-sm text-slate-400">Watchlist empty. Add symbols from token analysis.</div>}
    </div>
  );
}
