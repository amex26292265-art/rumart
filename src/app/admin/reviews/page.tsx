import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { moderateReview } from "@/app/actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { email: true } },
      product: { select: { title: true, slug: true } },
    },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink-950">Reviews</h1>
      <p className="mt-1 text-sm text-ink-500">Moderate customer reviews.</p>
      <div className="card mt-6 divide-y divide-mist-300">
        {reviews.length === 0 && <p className="p-5 text-sm text-ink-500">No reviews yet.</p>}
        {reviews.map((r) => (
          <div key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-ink-950">
                {r.rating}★ · {r.product.title}{" "}
                <Badge tone={r.status === "published" ? "success" : "warning"}>{r.status}</Badge>
                {r.verified && <Badge tone="accent">verified</Badge>}
              </p>
              <p className="text-xs text-ink-500">{r.user.email}</p>
              {r.comment && <p className="mt-1 text-sm text-ink-500">{r.comment}</p>}
            </div>
            <div className="flex gap-2">
              <form action={moderateReview}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="status" value="published" />
                <Button size="sm" variant="outline">
                  Publish
                </Button>
              </form>
              <form action={moderateReview}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="status" value="hidden" />
                <Button size="sm" variant="ghost">
                  Hide
                </Button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
