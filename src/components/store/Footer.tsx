import Link from "next/link";
import { Send } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Container } from "@/components/ui/container";
import { getSiteSettings } from "@/lib/site-settings";

export async function Footer() {
  const settings = await getSiteSettings();
  const groups = [
    {
      title: "Marketplace",
      links: [
        { href: "/marketplace", label: "All accounts" },
        { href: "/categories", label: "Categories" },
        { href: "/marketplace?sort=newest", label: "Recently added" },
      ],
    },
    {
      title: "Support",
      links: [
        { href: "/faq", label: "FAQ" },
        { href: "/orders", label: "My orders" },
        { href: "/login", label: "Sign in" },
      ],
    },
    {
      title: "Company",
      links: [
        { href: "/", label: "About" },
        { href: "/faq", label: "How it works" },
      ],
    },
  ];

  return (
    <footer className="mt-24 border-t border-mist-200 bg-mist-50">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-500">
            A premium marketplace for digital goods — instant, automated delivery.
          </p>
          <a
            href={settings.telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-mist-300 bg-white px-3 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:border-accent-500 hover:text-accent-600"
          >
            <Send className="h-4 w-4" /> @{settings.telegramHandle}
          </a>
        </div>
        {groups.map((g) => (
          <div key={g.title}>
            <h4 className="text-sm font-semibold text-ink-950">{g.title}</h4>
            <ul className="mt-3 space-y-2">
              {g.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-ink-500 transition-colors hover:text-ink-950">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <div className="border-t border-mist-200 py-5 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} Rumart — rumart.xyz · All rights reserved.
      </div>
    </footer>
  );
}
