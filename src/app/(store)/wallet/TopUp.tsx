"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Wallet, Bitcoin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createDeposit, type DepositProvider } from "@/app/actions/wallet";

const PRESETS = [5, 10, 25, 50, 100];

export function TopUp({
  enabled,
  providers = { nowpayments: true, redotpay: false },
}: {
  enabled: boolean;
  providers?: { nowpayments: boolean; redotpay: boolean };
}) {
  const params = useSearchParams();
  const suggested = Number(params.get("amount"));
  const [amount, setAmount] = useState<string>(
    suggested && suggested > 0 ? String(Math.ceil(suggested)) : "10",
  );
  const defaultProvider: DepositProvider = providers.nowpayments
    ? "nowpayments"
    : providers.redotpay
      ? "redotpay"
      : "nowpayments";
  const [provider, setProvider] = useState<DepositProvider>(defaultProvider);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value < 1) return setError("Enter at least $1.");
    startTransition(async () => {
      const res = await createDeposit(value, undefined, provider);
      if (res.ok) window.location.href = res.url;
      else setError(res.error);
    });
  };

  const both = providers.nowpayments && providers.redotpay;

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-accent-400" />
        <h2 className="font-semibold text-ink-950">Add funds with crypto</h2>
      </div>

      {suggested > 0 && (
        <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Add at least ${Math.ceil(suggested)} to complete your purchase.
        </p>
      )}

      {both && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setProvider("nowpayments")}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
              provider === "nowpayments"
                ? "border-accent-500/50 bg-accent-500/15 text-accent-400"
                : "border-mist-300 text-ink-500 hover:bg-mist-200"
            }`}
          >
            NOWPayments
          </button>
          <button
            type="button"
            onClick={() => setProvider("redotpay")}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
              provider === "redotpay"
                ? "border-accent-500/50 bg-accent-500/15 text-accent-400"
                : "border-mist-300 text-ink-500 hover:bg-mist-200"
            }`}
          >
            RedotPay
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setAmount(String(p))}
            className={`rounded-xl px-4 py-1.5 text-sm font-medium transition-colors ${
              amount === String(p)
                ? "bg-accent-500 text-white"
                : "bg-mist-200 text-ink-700 hover:bg-mist-300"
            }`}
          >
            ${p}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-[11px] font-semibold text-ink-500">Amount (USD)</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500">$</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            min="1"
            step="1"
            className="field !pl-7"
          />
        </div>
      </div>

      {error && <p className="mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-400">{error}</p>}

      <Button onClick={submit} disabled={pending || !enabled} size="lg" variant="accent" className="mt-5 w-full">
        <Bitcoin className="h-4 w-4" />
        {pending
          ? "Starting checkout…"
          : provider === "redotpay"
            ? "Pay with RedotPay"
            : "Pay with crypto"}
      </Button>

      {!enabled ? (
        <p className="mt-3 text-center text-xs text-ink-500">
          Crypto payments aren’t enabled yet — add NOWPayments or RedotPay keys.
        </p>
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-center text-xs text-ink-500"
        >
          {provider === "redotpay"
            ? "Pay with stablecoins via RedotPay Connect. Balance updates after webhook confirmation."
            : "Pay with USDT, BTC, ETH, LTC and more. Funds are added automatically once confirmed on-chain."}
        </motion.p>
      )}
    </div>
  );
}
