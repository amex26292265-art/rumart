"use client";

import { useEffect, useState } from "react";
import { OpportunityRow } from "@/components/ui/OpportunityRow";
import { BybitFeature, apiGet } from "@/lib/api";

export default function OpportunitiesPage() {
  const [items, setItems] = useState<BybitFeature[]>([]);
  useEffect(() => {
    const load = () => apiGet<{ items: BybitFeature[] }>("/tokens/opportunities").then((d) => setItems(d.items || []));
    load();
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">AI Opportunities</h1>
      {items.map((item, i) => (
        <OpportunityRow key={item.symbol} item={item} rank={i + 1} />
      ))}
      {!items.length && <div className="text-sm text-slate-400">No live opportunities yet.</div>}
    </div>
  );
}
