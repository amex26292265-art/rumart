"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Search, Zap, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { BackdropArt } from "@/components/brand/BackdropArt";

const SUGGESTIONS = ["Steam", "Fortnite", "Valorant", "EA FC", "GTA V", "Discord"];

export function Hero() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [query, setQuery] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/marketplace?q=${encodeURIComponent(query.trim())}` : "/marketplace");
  };

  return (
    <section className="relative overflow-hidden pt-20 pb-16">
      <BackdropArt />
      <Container className="relative">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.21, 0.65, 0.35, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-medium text-ink-500">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
            Automated delivery · Instant access
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-ink-950 sm:text-6xl">
            The premium marketplace for
            <span className="block text-ink-500">digital goods.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-ink-500 sm:text-lg">
            Buy verified accounts and digital products with instant, fully automated delivery.
            Clean, fast, and secure — the way a marketplace should feel.
          </p>

          <form onSubmit={submit} className="mx-auto mt-8 flex max-w-xl items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Steam, Fortnite, ChatGPT…"
                className="field !h-14 !rounded-full !pl-12 !text-base shadow-sm"
              />
            </div>
            <Button type="submit" size="lg" className="!h-14 !rounded-full">
              Search
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {SUGGESTIONS.map((s, i) => (
              <motion.button
                key={s}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                onClick={() => router.push(`/marketplace?q=${encodeURIComponent(s)}`)}
                className="rounded-full border border-mist-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:border-ink-900 hover:text-ink-950"
              >
                {s}
              </motion.button>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-ink-500">
            <span className="inline-flex items-center gap-2"><Zap className="h-4 w-4 text-accent-500" /> Instant delivery</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent-500" /> Encrypted credentials</span>
            <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-accent-500" /> 24/7 automated</span>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
