"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";

export interface FaqEntry {
  q: string;
  a: string;
}

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    q: "How fast is delivery?",
    a: "Instantly for auto-delivery listings. Once your payment is confirmed, Rumart purchases the item, encrypts the credentials, and shows them in your order — usually within seconds.",
  },
  {
    q: "Are the accounts genuine?",
    a: "Every listing is sourced live from our supplier network and only shown while it is actually available. Nothing on Rumart is fabricated or a placeholder.",
  },
  {
    q: "What payment methods can I use?",
    a: "Store credit today. Card payments (Stripe) and cryptocurrency are being added and will settle automatically — you never wait on manual confirmation.",
  },
  {
    q: "How are my credentials protected?",
    a: "Delivered credentials are encrypted at rest with AES-256-GCM and only decrypted for you inside your order. We never expose supplier data or API keys.",
  },
  {
    q: "What if something is wrong with my order?",
    a: "Open your order and contact support with the reference. Because delivery is automated and logged end-to-end, issues are quick to trace and resolve.",
  },
];

export function Faq({ entries = FAQ_ENTRIES }: { entries?: FaqEntry[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {entries.map((entry, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="card overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-medium text-ink-950">{entry.q}</span>
              <motion.span
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.2 }}
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                  isOpen ? "bg-ink-950 text-white" : "bg-mist-100 text-ink-500"
                }`}
              >
                <Plus className="h-4 w-4" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.26, ease: "easeOut" }}
                >
                  <p className="px-5 pb-5 text-sm leading-relaxed text-ink-500">{entry.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
