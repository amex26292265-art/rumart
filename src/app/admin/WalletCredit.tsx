"use client";

import { useState, useTransition } from "react";
import { creditWallet } from "@/app/actions/admin";

export function WalletCredit() {
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  const submit = () => {
    setMsg(null);
    start(async () => {
      const fd = new FormData();
      fd.set("email", email);
      fd.set("amount", amount);
      const res = await creditWallet(fd);
      if (res.ok) {
        setOk(true);
        setMsg(`Done — new balance $${res.balance.toFixed(2)}`);
        setAmount("");
      } else {
        setOk(false);
        setMsg(res.error);
      }
    });
  };

  return (
    <div className="card p-6">
      <h2 className="font-semibold text-ink-950">Manual wallet credit</h2>
      <p className="mt-1 text-xs text-ink-500">
        Fund a customer after an off-site payment (or top up your own account to test buying).
      </p>
      <div className="mt-4 space-y-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="customer@email.com"
          className="field"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          min="0"
          step="0.01"
          placeholder="Amount (USD)"
          className="field"
        />
        <button
          onClick={submit}
          disabled={pending || !email || !amount}
          className="w-full rounded-lg bg-ink-950 px-4 py-2 text-sm font-medium text-white hover:bg-ink-800 disabled:opacity-50"
        >
          {pending ? "Crediting…" : "Credit wallet"}
        </button>
        {msg && <p className={`text-xs ${ok ? "text-emerald-600" : "text-red-600"}`}>{msg}</p>}
      </div>
    </div>
  );
}
