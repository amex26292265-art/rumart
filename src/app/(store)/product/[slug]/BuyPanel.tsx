"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Zap, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkoutAction } from "@/app/actions/checkout";
import { formatMoney } from "@/lib/utils";

export function BuyPanel({
  productId,
  price,
  currency,
  deliveryType,
  authenticated,
}: {
  productId: string;
  price: number;
  currency: string;
  deliveryType: string;
  authenticated: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const buy = () => {
    setError(null);
    if (!authenticated) {
      router.push("/login?next=" + encodeURIComponent(location.pathname));
      return;
    }
    startTransition(async () => {
      const result = await checkoutAction(productId);
      // Not enough store credit → go top up the exact amount with crypto.
      if ("needTopup" in result) {
        router.push(`/wallet?amount=${result.amount}`);
        return;
      }
      // Delivered OR pending-with-reference both go to the order page, which
      // shows credentials or the Telegram contact fallback respectively.
      if ("reference" in result) router.push(`/orders/${result.reference}`);
      else setError(result.error);
    });
  };

  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-semibold text-ink-950">{formatMoney(price, currency)}</span>
        {deliveryType === "auto" ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
            <Zap className="h-4 w-4" /> Instant
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm text-ink-500">
            <ShieldCheck className="h-4 w-4" /> Manual
          </span>
        )}
      </div>

      <Button onClick={buy} disabled={pending} size="lg" className="mt-5 w-full">
        {pending ? "Processing…" : "Buy now"}
      </Button>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600"
        >
          {error}
        </motion.p>
      )}

      <p className="mt-4 flex items-center gap-2 text-xs text-ink-400">
        <Lock className="h-3.5 w-3.5" /> Credentials are encrypted and delivered to your order instantly.
      </p>
    </div>
  );
}
