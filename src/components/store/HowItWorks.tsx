import { Search, CreditCard, KeyRound } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/ui/motion";

const STEPS = [
  { icon: Search, title: "Choose", text: "Browse verified listings and pick the account or product you want." },
  { icon: CreditCard, title: "Pay", text: "Checkout securely. Payment is confirmed automatically — no waiting." },
  { icon: KeyRound, title: "Receive", text: "Credentials are purchased, encrypted, and delivered to you instantly." },
];

export function HowItWorks() {
  return (
    <Stagger className="grid gap-4 sm:grid-cols-3" stagger={0.12}>
      {STEPS.map((s, i) => (
        <StaggerItem key={s.title}>
          <div className="card group relative h-full p-6">
            <span className="absolute right-5 top-4 text-5xl font-semibold text-mist-100">
              {i + 1}
            </span>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-950 text-white transition-transform group-hover:scale-105">
              <s.icon className="h-5 w-5" strokeWidth={1.6} />
            </span>
            <h3 className="mt-4 text-lg font-semibold text-ink-950">{s.title}</h3>
            <p className="mt-1.5 text-sm text-ink-500">{s.text}</p>
          </div>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
