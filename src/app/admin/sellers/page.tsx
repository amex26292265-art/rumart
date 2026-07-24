import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { reviewSellerApplication } from "@/app/actions/admin";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminSellersPage() {
  const [apps, sellers] = await Promise.all([
    prisma.sellerApplication.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { email: true } } },
    }),
    prisma.sellerProfile.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { email: true } }, _count: { select: { products: true } } },
    }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink-950">Sellers</h1>
      <p className="mt-1 text-sm text-ink-500">Approve applications and monitor seller accounts.</p>

      <h2 className="mb-3 mt-8 font-semibold text-ink-950">Applications</h2>
      <div className="card divide-y divide-mist-300">
        {apps.length === 0 && <p className="p-5 text-sm text-ink-500">No applications yet.</p>}
        {apps.map((a) => (
          <div key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-ink-950">
                {a.displayName}{" "}
                <Badge tone={a.status === "pending" ? "warning" : a.status === "approved" ? "success" : "danger"}>
                  {a.status}
                </Badge>
              </p>
              <p className="text-xs text-ink-500">{a.user.email}</p>
              {a.bio && <p className="mt-1 text-sm text-ink-500">{a.bio}</p>}
            </div>
            {a.status === "pending" && (
              <div className="flex gap-2">
                <form
                  action={async (fd) => {
                    "use server";
                    await reviewSellerApplication(fd);
                  }}
                >
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <Button size="sm">Approve</Button>
                </form>
                <form
                  action={async (fd) => {
                    "use server";
                    await reviewSellerApplication(fd);
                  }}
                >
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <Button size="sm" variant="outline">
                    Reject
                  </Button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-10 font-semibold text-ink-950">Active sellers</h2>
      <div className="card divide-y divide-mist-300">
        {sellers.length === 0 && <p className="p-5 text-sm text-ink-500">No sellers yet.</p>}
        {sellers.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-medium text-ink-950">
                {s.displayName} {s.verified && <Badge tone="accent">verified</Badge>}
              </p>
              <p className="text-xs text-ink-500">
                {s.user.email} · /{s.slug} · {s._count.products} listings
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-ink-950">{formatMoney(s.earnings)}</p>
              <p className="text-xs text-ink-500">{s.salesCount} sales</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
