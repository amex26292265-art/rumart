"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Zap, ShieldCheck, Lock, Tag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkoutAction, previewPromo } from "@/app/actions/checkout";
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

  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number; finalPrice: number } | null>(null);
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const effectivePrice = applied ? applied.finalPrice : price;

  const applyCode = () => {
    if (!code.trim()) return;
    if (!authenticated) {
      router.push("/login?next=" + encodeURIComponent(location.pathname));
      return;
    }
    setCodeMsg(null);
    setChecking(true);
    startTransition(async () => {
      const res = await previewPromo(productId, code);
      setChecking(false);
      if (res.ok) {
        setApplied({ code: res.code, discount: res.discount, finalPrice: res.finalPrice });
        setCodeMsg(null);
      } else {
        setApplied(null);
        setCodeMsg(res.error);
      }
    });
  };

  const buy = () => {
    setError(null);
    if (!authenticated) {
      router.push("/login?next=" + encodeURIComponent(location.pathname));
      return;
    }
    startTransition(async () => {
      const result = await checkoutAction(productId, applied?.code);
      if ("needTopup" in result) {
        router.push(`/wallet?amount=${result.amount}`);
        return;
      }
      if ("reference" in result) router.push(`/orders/${result.reference}`);
      else setError(result.error);
    });
  };

  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-ink-950">{formatMoney(effectivePrice, currency)}</span>
          {applied && (
            <span className="text-base font-medium text-ink-400 line-through">{formatMoney(price, currency)}</span>
          )}
        </div>
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

      {applied && (
        <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
          <Check className="h-3.5 w-3.5" /> Code {applied.code} applied — you save {formatMoney(applied.discount, currency)}
        </p>
      )}

      <Button onClick={buy} disabled={pending} size="lg" className="mt-5 w-full">
        {pending ? "Processing…" : "Buy now"}
      </Button>

      {/* Promo code */}
      {!showCode ? (
        <button
          onClick={() => setShowCode(true)}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline"
        >
          <Tag className="h-3.5 w-3.5" /> Have a promo code?
        </button>
      ) : (
        <div className="mt-3">
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="LAUNCH10"
              className="field flex-1 uppercase"
            />
            <button
              onClick={applyCode}
              disabled={checking || !code.trim()}
              className="rounded-lg border border-mist-300 px-3 text-sm font-medium text-ink-700 hover:border-ink-400 disabled:opacity-50"
            >
              {checking ? "…" : "Apply"}
            </button>
          </div>
          {codeMsg && <p className="mt-1.5 text-xs text-red-600">{codeMsg}</p>}
        </div>
      )}

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
