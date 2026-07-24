import Link from "next/link";
import { Send, Shield } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Container } from "@/components/ui/container";
import { getSiteSettings } from "@/lib/site-settings";

export async function Footer() {
  const settings = await getSiteSettings();
  const groups = [
    {
      title: "Marketplace",
      links: [
        { href: "/marketplace", label: "Browse all" },
        { href: "/categories", label: "Categories" },
        { href: "/marketplace?sort=newest", label: "Newest arrivals" },
        { href: "/categories#ai", label: "AI subscriptions" },
      ],
    },
    {
      title: "Account",
      links: [
        { href: "/account", label: "Dashboard" },
        { href: "/account/orders", label: "My orders" },
        { href: "/wallet", label: "Wallet" },
        { href: "/account/wishlist", label: "Wishlist" },
      ],
    },
    {
      title: "Company",
      links: [
        { href: "/faq", label: "FAQ" },
        { href: "/sell", label: "Become a seller" },
        { href: "/faq", label: "How it works" },
        { href: "/login", label: "Sign in" },
      ],
    },
  ];

  return (
    <footer className="mt-24 border-t border-mist-300 bg-mist-50">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo showOwner />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-500">
            Premium digital marketplace for game accounts, AI tools, and software — instant encrypted delivery.
          </p>
          <a
            href={settings.telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-mist-300 bg-mist-100 px-3 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:border-accent-500/50 hover:text-accent-400"
          >
            <Send className="h-4 w-4" /> @{settings.telegramHandle}
          </a>
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-500">
            <Shield className="h-3.5 w-3.5 text-accent-400" /> AES-256 encrypted credentials
          </p>
        </div>
        {groups.map((g) => (
          <div key={g.title}>
            <h4 className="text-sm font-semibold text-ink-950">{g.title}</h4>
            <ul className="mt-3 space-y-2">
              {g.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-ink-500 transition-colors hover:text-accent-400">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <div className="border-t border-mist-300 py-5 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} Rumart · A Velexis product · All rights reserved.
      </div>
    </footer>
  );
}
