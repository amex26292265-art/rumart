"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="pl-[232px]">
        <TopBar />
        <main className="px-5 py-4 pb-10">{children}</main>
        <footer className="border-t border-[var(--border)] px-5 py-2 text-[11px] text-[var(--muted)]">
          Decision-support system. Never invents data. Paper trading only. Not financial advice.
        </footer>
      </div>
    </div>
  );
}
