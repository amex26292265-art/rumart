"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  RefreshCw,
  Tags,
  Package,
  Receipt,
  Settings,
  Ticket,
  Store,
  Star,
  ScrollText,
  Users,
  ImageIcon,
  Activity,
  type LucideIcon,
} from "lucide-react";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/health", label: "System health", icon: Activity },
  { href: "/admin/sync", label: "Synchronization", icon: RefreshCw },
  { href: "/admin/pricing", label: "Pricing", icon: Tags },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Banners & logos", icon: ImageIcon },
  { href: "/admin/orders", label: "Orders", icon: Receipt },
  { href: "/admin/sellers", label: "Sellers", icon: Store },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/promos", label: "Promo codes", icon: Ticket },
  { href: "/admin/team", label: "Admin team", icon: Users },
  { href: "/admin/logs", label: "Audit logs", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {ITEMS.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-accent-500/20 text-accent-400"
                : "text-ink-500 hover:bg-mist-200 hover:text-ink-950"
            }`}
          >
            <item.icon className="h-4 w-4" strokeWidth={1.7} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
