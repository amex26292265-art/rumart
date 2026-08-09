"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  BookOpen,
  Brain,
  CandlestickChart,
  ClipboardList,
  Flame,
  History,
  LayoutDashboard,
  LineChart,
  Newspaper,
  Radar,
  Settings,
  Sparkles,
  TrendingUp,
  Wallet,
  Waves,
} from "lucide-react";
import { cn } from "@/lib/api";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/opportunities", label: "AI Opportunities", icon: Sparkles },
  { href: "/bybit", label: "Bybit Scanner", icon: Radar },
  { href: "/bybit/new-listings", label: "New Listings", icon: Flame },
  { href: "/solana", label: "Solana Scanner", icon: Waves },
  { href: "/trending", label: "Trending", icon: TrendingUp },
  { href: "/smart-money", label: "Smart Money", icon: Brain },
  { href: "/narratives", label: "Narratives", icon: BookOpen },
  { href: "/news", label: "News & Social", icon: Newspaper },
  { href: "/watchlist", label: "Watchlist", icon: ClipboardList },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/paper", label: "Paper Trading", icon: CandlestickChart },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/signals", label: "Signal History", icon: History },
  { href: "/backtests", label: "Backtests", icon: LineChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-[232px] flex-col border-r border-[var(--border)] bg-[#0a1018]/95 backdrop-blur">
      <div className="border-b border-[var(--border)] px-4 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300/80">Memecoin</div>
        <div className="mt-1 text-lg font-semibold tracking-tight">Intelligence</div>
        <div className="mt-1 text-[11px] text-[var(--muted)]">Paper mode · evidence-first</div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition",
                active
                  ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/30"
                  : "text-slate-300/85 hover:bg-white/5 hover:text-white",
              )}
            >
              <span
                className={cn(
                  "h-4 w-0.5 rounded-full",
                  active ? "bg-violet-400" : "bg-transparent group-hover:bg-slate-600",
                )}
              />
              <Icon size={15} className={active ? "text-violet-300" : "text-slate-400"} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[var(--border)] px-3 py-3 text-[11px] text-[var(--muted)]">
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-emerald-400" />
          Decision support only
        </div>
      </div>
    </aside>
  );
}
