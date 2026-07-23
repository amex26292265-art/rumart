"use client";

import { useState, useTransition } from "react";
import { createManualProduct } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

export function CreateProductForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="card space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          setMsg(null);
          const res = await createManualProduct(fd);
          setMsg(res.ok ? `Created /product/${res.slug}` : res.error);
          if (res.ok) (e.target as HTMLFormElement).reset();
        });
      }}
    >
      <input name="title" required className="field" placeholder="Professional marketplace title" />
      <textarea name="description" className="field min-h-[70px]" placeholder="Rich description" />
      <input name="price" type="number" step="0.01" min="0.5" required className="field" placeholder="Price USD" />
      <select name="categoryId" className="field" required defaultValue={categories[0]?.id}>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select name="deliveryType" className="field" defaultValue="manual">
        <option value="manual">Manual delivery</option>
        <option value="auto">Auto (from stock JSON)</option>
      </select>
      <textarea name="images" className="field min-h-[60px]" placeholder="Image URLs (comma or newline)" />
      <textarea
        name="credentialJson"
        className="field min-h-[80px] font-mono text-xs"
        placeholder='Stock JSON: [{"Login":"x","Password":"y"}]'
      />
      {msg && <p className="text-xs text-ink-500">{msg}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating…" : "Create product"}
      </Button>
    </form>
  );
}
