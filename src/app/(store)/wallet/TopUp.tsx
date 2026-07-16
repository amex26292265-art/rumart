"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Wallet, Bitcoin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createDeposit } from "@/app/actions/wallet";

const PRESETS = [5, 10, 25, 50, 100];

export function TopUp({ enabled }: { enabled: boolean }) {
  const params = useSearchParams();
  const suggested = Number(params.get("amount"));
  const [amount, setAmount] = useState<string>(
    suggested && suggested > 0 ? String(Math.ceil(suggested)) : "10",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value < 1) return setError("Enter at least $1.");
    startTransition(async () => {
      const res = await createDeposit(value);
      if (res.ok) window.location.href = res.url; // hosted NOWPayments checkout
      else setError(res.error);
    });
  };

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-ink-500" />
        <h2 className="font-semibold text-ink-950">Add funds with crypto</h2>
      </div>

      {suggested > 0 && (
        <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Add at least ${Math.ceil(suggested)} to complete your purchase.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setAmount(String(p))}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              amount === String(p) ? "bg-ink-950 text-white" : "bg-mist-100 text-ink-700 hover:bg-mist-200"
            }`}
          >
            ${p}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-[11px] font-semibold text-ink-400">Amount (USD)</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">$</span>
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

      {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <Button onClick={submit} disabled={pending || !enabled} size="lg" variant="accent" className="mt-5 w-full">
        <Bitcoin className="h-4 w-4" />
        {pending ? "Starting checkout…" : "Pay with crypto"}
      </Button>

      {!enabled ? (
        <p className="mt-3 text-center text-xs text-ink-400">
          Crypto payments aren’t enabled yet — add your NOWPayments keys to turn this on.
        </p>
      ) : (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 text-center text-xs text-ink-400"
        >
          Pay with USDT (TRC20/BEP20), BTC, ETH, LTC and more. Funds are added automatically once the
          payment is confirmed on-chain.
        </motion.p>
      )}
    </div>
  );
}
