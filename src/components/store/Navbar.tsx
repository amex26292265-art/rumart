"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Search,
  Menu,
  X,
  User,
  Wallet,
  Bell,
  LayoutDashboard,
  MessageSquare,
  Store,
  Users,
  Layers,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { cn, formatMoney } from "@/lib/utils";

const LINKS = [
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/community", label: "Community", icon: Users },
  { href: "/categories", label: "Categories", icon: Layers },
  { href: "/sell", label: "Sell", icon: Sparkles },
];

export function Navbar({
  signedIn = false,
  walletBalance = 0,
  unreadNotifications = 0,
  unreadMessages = 0,
}: {
  signedIn?: boolean;
  walletBalance?: number;
  unreadNotifications?: number;
  unreadMessages?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    router.push(query.trim() ? `/marketplace?q=${encodeURIComponent(query.trim())}` : "/marketplace");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-mist-300/60 bg-paper/80 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-500/50 to-transparent" />
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="Rumart home" className="shrink-0">
          <Logo showOwner={false} />
        </Link>

        <nav className="ml-2 hidden items-center gap-0.5 xl:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent-600/20 text-accent-400"
                    : "text-ink-500 hover:bg-mist-200 hover:text-ink-950",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <form onSubmit={submit} className="relative ml-auto hidden max-w-xs flex-1 lg:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ecosystem…"
            className="field !rounded-xl !pl-9"
          />
        </form>

        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
          {signedIn ? (
            <>
              <Link
                href="/messages"
                className="relative hidden h-10 w-10 place-items-center rounded-xl border border-mist-300 text-ink-700 transition-colors hover:border-accent-500/40 hover:text-ink-950 sm:grid"
                aria-label="Messages"
              >
                <MessageSquare className="h-4 w-4" />
                {unreadMessages > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent-500 px-1 text-[0.6rem] font-bold text-white">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </Link>
              <Link
                href="/account/notifications"
                className="relative hidden h-10 w-10 place-items-center rounded-xl border border-mist-300 text-ink-700 transition-colors hover:border-accent-500/40 hover:text-ink-950 sm:grid"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent-500 px-1 text-[0.6rem] font-bold text-white">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Link>
              <Link
                href="/wallet"
                className="hidden items-center gap-2 rounded-xl border border-mist-300 bg-mist-100 px-3 py-1.5 text-sm font-medium text-ink-900 transition-colors hover:border-accent-500/50 hover:text-accent-400 md:inline-flex"
              >
                <Wallet className="h-4 w-4 text-accent-400" />
                {formatMoney(walletBalance)}
              </Link>
              <Link
                href="/account"
                className="hidden items-center gap-2 rounded-xl border border-mist-300 bg-mist-100 px-3 py-1.5 text-sm font-medium text-ink-900 transition-colors hover:border-accent-500/50 md:inline-flex"
              >
                <LayoutDashboard className="h-4 w-4" /> Hub
              </Link>
            </>
          ) : (
            <Link href="/login" className="hidden md:block">
              <Button variant="outline" size="sm">
                <User className="h-4 w-4" /> Sign in
              </Button>
            </Link>
          )}
          <button
            type="button"
            aria-label="Menu"
            onClick={() => setOpen((o) => !o)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-mist-300 text-ink-700 xl:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-mist-300 xl:hidden">
          <div className="flex flex-col gap-1 px-4 py-4">
            <form onSubmit={submit} className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ecosystem…"
                className="field !rounded-xl !pl-9"
              />
            </form>
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-mist-200"
              >
                {l.label}
              </Link>
            ))}
            {signedIn ? (
              <>
                <Link href="/messages" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-mist-200">
                  Messages{unreadMessages > 0 ? ` (${unreadMessages})` : ""}
                </Link>
                <Link href="/wallet" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-mist-200">
                  Wallet · {formatMoney(walletBalance)}
                </Link>
                <Link href="/account" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-mist-200">
                  Account hub
                </Link>
              </>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">
                  <User className="h-4 w-4" /> Sign in
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
