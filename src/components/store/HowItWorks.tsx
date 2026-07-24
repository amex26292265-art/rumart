import { Search, Wallet, KeyRound } from "lucide-react";

const STEPS = [
  { icon: Search, title: "Browse", text: "Explore verified game accounts, AI subscriptions, and digital goods across premium categories." },
  { icon: Wallet, title: "Top up & buy", text: "Fund your Rumart wallet with crypto, then checkout in one click — no waiting on invoices." },
  { icon: KeyRound, title: "Instant delivery", text: "Credentials are purchased upstream, encrypted with AES-256-GCM, and unlocked in your order." },
];

export function HowItWorks() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {STEPS.map((s, i) => (
        <div key={s.title} className="card group relative h-full overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent-500/10 blur-2xl" />
          <span className="absolute right-5 top-4 font-display text-5xl font-bold text-mist-200">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-accent-600 to-accent-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.35)]">
            <s.icon className="h-5 w-5" strokeWidth={1.6} />
          </span>
          <h3 className="mt-4 font-display text-lg font-bold text-ink-950">{s.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{s.text}</p>
        </div>
      ))}
    </div>
  );
}
