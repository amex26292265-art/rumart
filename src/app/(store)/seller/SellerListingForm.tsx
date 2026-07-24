"use client";

import { useState } from "react";
import { createSellerListing } from "@/app/actions/seller";
import { Button } from "@/components/ui/button";

export function SellerListingForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("10");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [credentialJson, setCredentialJson] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="card space-y-3 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setMsg(null);
        const res = await createSellerListing({
          title,
          description,
          price: parseFloat(price),
          categoryId,
          credentialJson: credentialJson || undefined,
        });
        setLoading(false);
        if (!res.ok) {
          setMsg(res.error ?? "Failed");
          return;
        }
        setTitle("");
        setDescription("");
        setCredentialJson("");
        setMsg("Listing created.");
        window.location.reload();
      }}
    >
      <input className="field" required placeholder="Professional title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="field min-h-[70px]" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <input className="field" type="number" step="0.01" min="0.5" required value={price} onChange={(e) => setPrice(e.target.value)} />
      <select className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <textarea
        className="field min-h-[80px] font-mono text-xs"
        placeholder='Optional stock JSON: [{"Login":"x","Password":"y"}]'
        value={credentialJson}
        onChange={(e) => setCredentialJson(e.target.value)}
      />
      {msg && <p className="text-sm text-ink-500">{msg}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating…" : "Publish listing"}
      </Button>
    </form>
  );
}
