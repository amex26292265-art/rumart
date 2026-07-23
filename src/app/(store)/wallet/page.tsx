import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isPaymentsConfigured } from "@/lib/env";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/ui/motion";
import { formatMoney } from "@/lib/utils";
import { TopUp } from "./TopUp";
import { WalletAutoRefresh } from "./WalletAutoRefresh";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wallet" };

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login?next=/wallet");

  const [user, deposits] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.deposit.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  return (
    <Container className="max-w-3xl py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink-950">Wallet</h1>

      {sp.paid && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> Payment received — your balance updates automatically once confirmed on-chain.
        </div>
      )}
      <WalletAutoRefresh active={Boolean(sp.paid)} />
      {/* If a payment funds a specific purchase, the account is delivered
          automatically — check your orders once the balance updates. */}

      <Reveal className="mt-6 grid gap-6 sm:grid-cols-[1fr_1.1fr]">
        {/* Balance card */}
        <div className="card flex flex-col justify-center bg-gradient-to-br from-accent-700/40 to-mist-100 p-6">
          <span className="text-sm text-ink-500">Store credit</span>
          <span className="mt-1 font-display text-4xl font-bold text-ink-950">
            {formatMoney(user?.walletBalance ?? 0)}
          </span>
          <p className="mt-2 text-xs text-ink-500">Use it to buy any listing instantly.</p>
        </div>

        <TopUp enabled={isPaymentsConfigured} />
      </Reveal>

      {/* Deposit history */}
      <div className="card mt-8 overflow-hidden">
        <div className="border-b border-mist-300 px-5 py-3 text-sm font-semibold text-ink-950">Top-up history</div>
        {deposits.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-500">No top-ups yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {deposits.map((d) => (
                <tr key={d.id} className="border-b border-mist-300">
                  <td className="px-5 py-3 text-ink-500">{d.createdAt.toLocaleString()}</td>
                  <td className="px-5 py-3 font-medium text-ink-950">{formatMoney(d.amount, d.currency)}</td>
                  <td className="px-5 py-3 text-ink-500">{d.provider}</td>
                  <td className="px-5 py-3 text-right">
                    <Badge
                      tone={
                        d.status === "paid"
                          ? "success"
                          : d.status === "pending"
                            ? "warning"
                            : d.status === "partial"
                              ? "warning"
                              : "neutral"
                      }
                    >
                      {d.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Container>
  );
}
