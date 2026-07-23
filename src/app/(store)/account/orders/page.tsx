import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };

const TONE: Record<string, "success" | "warning" | "danger" | "neutral" | "accent"> = {
  completed: "success",
  pending: "warning",
  refunded: "danger",
  cancelled: "neutral",
  failed: "danger",
};

export default async function OrdersPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login?next=/account/orders");

  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
    take: 50,
  });

  return (
    <Container className="py-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">My orders</h1>
          <p className="mt-1 text-sm text-ink-500">Purchase history and delivery status</p>
        </div>
        <Link href="/account" className="text-sm font-semibold text-accent-400">
          ← Account
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink-950">No orders yet</p>
          <p className="mt-1 text-sm text-ink-500">Browse the marketplace to make your first purchase.</p>
          <Link href="/marketplace" className="mt-4 inline-block text-sm font-semibold text-accent-400">
            Browse marketplace →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.reference}`}
                className="card flex flex-col gap-3 p-4 transition-colors hover:border-accent-500/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-ink-950">{o.reference}</span>
                    <Badge tone={TONE[o.status] ?? "neutral"}>{o.status}</Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-ink-500">
                    {o.items.map((i) => i.title).join(", ") || "Order"}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">{o.createdAt.toLocaleString()}</p>
                </div>
                <span className="text-lg font-bold text-ink-950">{formatMoney(o.total, o.currency)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
