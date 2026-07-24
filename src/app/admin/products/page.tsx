import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { updateProduct } from "@/app/actions/admin";
import { formatMoney } from "@/lib/utils";
import { CreateProductForm } from "./CreateProductForm";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { category: true },
    }),
    prisma.category.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink-950">
        Products ({products.length})
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Edit synced listings or create manual / AI / custom products.
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          {products.length === 0 ? (
            <EmptyState
              title="No products imported yet"
              description="Configure a sync rule and run synchronization, or create a manual product."
            />
          ) : (
            <div className="card divide-y divide-mist-300 overflow-hidden">
              {products.map((p) => (
                <details key={p.id} className="group">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-3 text-sm hover:bg-mist-100">
                    <span className="min-w-0 flex-1 truncate font-medium text-ink-950">{p.title}</span>
                    <Badge tone="neutral">{p.sourceType}</Badge>
                    <span className="text-ink-500">{p.category.name}</span>
                    <span className="font-semibold text-ink-950">{formatMoney(p.price, p.currency)}</span>
                    <Badge tone={p.status === "active" ? "success" : p.status === "sold" ? "dark" : "neutral"}>
                      {p.status}
                    </Badge>
                  </summary>
                  <form action={updateProduct} className="grid gap-3 border-t border-mist-300 bg-mist-50 p-4 sm:grid-cols-2">
                    <input type="hidden" name="id" value={p.id} />
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[11px] font-semibold text-ink-500">Title</label>
                      <input name="title" defaultValue={p.title} className="field" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-ink-500">
                        Sell price ({p.currency})
                      </label>
                      <input name="price" type="number" step="0.01" min="0" defaultValue={p.price} className="field" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-ink-500">Visibility</label>
                      <select name="status" defaultValue={p.status} className="field">
                        <option value="active">Active</option>
                        <option value="hidden">Hidden</option>
                        <option value="unavailable">Unavailable</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-[11px] font-semibold text-ink-500">Description</label>
                      <textarea name="description" defaultValue={p.description ?? ""} rows={3} className="field" />
                    </div>
                    <div className="sm:col-span-2">
                      <Button size="sm">Save changes</Button>
                    </div>
                  </form>
                </details>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 font-display text-lg font-bold text-ink-950">Create manual product</h2>
          <CreateProductForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
        </div>
      </div>
    </div>
  );
}
