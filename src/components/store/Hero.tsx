"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Search, Zap, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { BackdropArt } from "@/components/brand/BackdropArt";
import { LogoMark } from "@/components/brand/Logo";

export function Hero() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [query, setQuery] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(query.trim() ? `/marketplace?q=${encodeURIComponent(query.trim())}` : "/marketplace");
  };

  return (
    <section className="relative overflow-hidden pb-20 pt-16 sm:pt-24">
      <BackdropArt />
      <Container className="relative">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.21, 0.65, 0.35, 1] }}
          className="mx-auto max-w-4xl text-center"
        >
          <div className="mb-6 flex justify-center">
            <LogoMark className="h-16 w-16 shadow-[0_0_48px_rgba(139,92,246,0.45)]" />
          </div>
          <p className="font-display text-sm font-semibold uppercase tracking-[0.28em] text-accent-400">
            Rumart · by Velexis
          </p>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-ink-950 sm:text-6xl lg:text-7xl">
            The digital marketplace
            <span className="mt-1 block text-gradient">built for speed.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-ink-500 sm:text-lg">
            Game accounts, AI subscriptions, and premium software — wallet checkout, encrypted credentials, instant delivery.
          </p>

          <form onSubmit={submit} className="mx-auto mt-9 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Valorant, ChatGPT, Steam…"
                className="field !h-14 !rounded-xl !pl-12 !text-base"
              />
            </div>
            <Button type="submit" size="lg" className="!h-14 !rounded-xl sm:px-8">
              Explore
            </Button>
          </form>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-ink-500">
            <span className="inline-flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent-400" /> Instant delivery
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent-400" /> Encrypted vault
            </span>
            <span className="inline-flex items-center gap-2">
              <Wallet className="h-4 w-4 text-accent-400" /> Crypto wallet top-up
            </span>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
