import Link from "next/link";
import { Send, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Community CTA — Telegram instead of fake email newsletter. */
export function Newsletter({ telegramUrl = "https://t.me/rumartxyz" }: { telegramUrl?: string }) {
  return (
    <div className="card relative overflow-hidden px-6 py-12 text-center sm:px-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.18),_transparent_65%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 dot-grid" />
      <div className="relative mx-auto max-w-xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-accent-500/30 bg-accent-500/10 px-3 py-1 text-xs font-medium text-accent-400">
          <Shield className="h-3.5 w-3.5" /> Community · Support · Drops
        </span>
        <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
          Join the Rumart community
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
          Get drop alerts, support, and marketplace updates on Telegram — no spam inboxes.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a href={telegramUrl} target="_blank" rel="noopener noreferrer">
            <Button size="lg">
              <Send className="h-4 w-4" /> Open Telegram
            </Button>
          </a>
          <Link href="/marketplace">
            <Button variant="outline" size="lg">
              Browse marketplace
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
