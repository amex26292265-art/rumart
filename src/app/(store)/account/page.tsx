import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Wallet,
  Package,
  Bell,
  Heart,
  Shield,
  Store,
  ChevronRight,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/container";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login?next=/account");

  const [user, orderCount, unread, wishlistCount, seller] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.order.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, read: false } }),
    prisma.wishlistItem.count({ where: { userId } }),
    prisma.sellerProfile.findUnique({ where: { userId } }),
  ]);
  if (!user) redirect("/login");

  const links = [
    { href: "/account/orders", label: "Orders", desc: `${orderCount} purchase${orderCount === 1 ? "" : "s"}`, icon: Package },
    { href: "/wallet", label: "Wallet", desc: formatMoney(user.walletBalance), icon: Wallet },
    { href: "/account/notifications", label: "Notifications", desc: unread ? `${unread} unread` : "All caught up", icon: Bell },
    { href: "/account/wishlist", label: "Wishlist", desc: `${wishlistCount} saved`, icon: Heart },
    { href: "/account/security", label: "Security", desc: "Password & sessions", icon: Shield },
    seller
      ? { href: "/seller", label: "Seller dashboard", desc: seller.displayName, icon: Store }
      : { href: "/sell", label: "Become a seller", desc: "Apply to list products", icon: Store },
  ];

  return (
    <Container className="py-12">
      <h1 className="font-display text-3xl font-bold text-ink-950">Account</h1>
      <p className="mt-1 text-sm text-ink-500">
        Signed in as <span className="text-ink-800">{user.email}</span>
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="card group flex items-center gap-4 p-5 transition-all hover:border-accent-500/40 hover:shadow-[0_0_24px_rgba(139,92,246,0.12)]"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-500/15 text-accent-400">
              <l.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink-950">{l.label}</p>
              <p className="truncate text-sm text-ink-500">{l.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-ink-500 transition-transform group-hover:translate-x-0.5 group-hover:text-accent-400" />
          </Link>
        ))}
      </div>
    </Container>
  );
}
