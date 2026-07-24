import Link from "next/link";
import { Store, BadgeCheck, BarChart3, Wallet } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SellerApplyForm } from "./SellerApplyForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sell on Rumart" };

export default async function SellPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const [profile, pending] = userId
    ? await Promise.all([
        prisma.sellerProfile.findUnique({ where: { userId } }),
        prisma.sellerApplication.findFirst({ where: { userId, status: "pending" } }),
      ])
    : [null, null];

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-accent-500/30 bg-accent-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-400">
          <Store className="h-3.5 w-3.5" /> Seller marketplace
        </span>
        <h1 className="mt-4 font-display text-4xl font-bold text-ink-950">Sell on Rumart</h1>
        <p className="mx-auto mt-3 max-w-xl text-ink-500">
          List digital products to a premium audience. Admin-verified sellers get a dashboard, badges, and payout tracking.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
        {[
          { icon: BadgeCheck, title: "Verified badge", text: "Build trust with buyers" },
          { icon: BarChart3, title: "Seller stats", text: "Sales, ratings, earnings" },
          { icon: Wallet, title: "Payouts ready", text: "Future-ready payout ledger" },
        ].map((f) => (
          <div key={f.title} className="card p-5 text-center">
            <f.icon className="mx-auto h-6 w-6 text-accent-400" />
            <p className="mt-3 font-semibold text-ink-950">{f.title}</p>
            <p className="mt-1 text-xs text-ink-500">{f.text}</p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-10 max-w-lg">
        {profile ? (
          <div className="card space-y-4 p-6 text-center">
            <p className="text-ink-950">You&apos;re an approved seller: {profile.displayName}</p>
            <Link href="/seller">
              <Button size="lg">Open seller dashboard</Button>
            </Link>
          </div>
        ) : pending ? (
          <div className="card p-6 text-center text-sm text-ink-500">
            Your application is pending admin review.
          </div>
        ) : (
          <SellerApplyForm signedIn={Boolean(userId)} />
        )}
      </div>
    </Container>
  );
}
