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
  type LucideIcon,
} from "lucide-react";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/sync", label: "Synchronization", icon: RefreshCw },
  { href: "/admin/pricing", label: "Pricing", icon: Tags },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: Receipt },
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
              active ? "bg-ink-950 text-white" : "text-ink-500 hover:bg-mist-100 hover:text-ink-950"
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
