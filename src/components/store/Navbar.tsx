"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Menu, X, User, Wallet } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

const LINKS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/categories", label: "Categories" },
  { href: "/faq", label: "FAQ" },
];

export function Navbar({
  signedIn = false,
  walletBalance = 0,
}: {
  signedIn?: boolean;
  walletBalance?: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    router.push(query.trim() ? `/marketplace?q=${encodeURIComponent(query.trim())}` : "/marketplace");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-mist-200 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Rumart home">
          <Logo />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              prefetch={false}
              className="rounded-full px-3 py-2 text-sm font-medium text-ink-500 transition-colors hover:bg-mist-100 hover:text-ink-950"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={submit} className="relative ml-auto hidden max-w-xs flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search accounts…"
            className="field !rounded-full !pl-9"
          />
        </form>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {signedIn ? (
            <Link
              href="/wallet"
              className="hidden items-center gap-2 rounded-full border border-mist-300 bg-white px-3 py-1.5 text-sm font-medium text-ink-900 transition-colors hover:border-accent-500 hover:text-accent-600 md:inline-flex"
            >
              <Wallet className="h-4 w-4 text-ink-500" />
              {formatMoney(walletBalance)}
            </Link>
          ) : (
            <Link href="/login" className="hidden md:block">
              <Button variant="outline" size="sm">
                <User className="h-4 w-4" /> Sign in
              </Button>
            </Link>
          )}
          <button
            aria-label="Menu"
            onClick={() => setOpen((o) => !o)}
            className="grid h-10 w-10 place-items-center rounded-full border border-mist-300 text-ink-700 md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden border-t border-mist-200 md:hidden"
          >
            <div className="flex flex-col gap-2 px-4 py-4">
              <form onSubmit={submit} className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search accounts…"
                  className="field !rounded-full !pl-9"
                />
              </form>
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-mist-100"
                >
                  {l.label}
                </Link>
              ))}
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">
                  <User className="h-4 w-4" /> Sign in
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
