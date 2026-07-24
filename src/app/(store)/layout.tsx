import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";

/**
 * Stream the page shell immediately. Auth/wallet for the navbar resolves in a
 * Suspense boundary so Neon round-trips don't block the main content.
 */
export const dynamic = "force-dynamic";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Suspense fallback={<Navbar signedIn={false} walletBalance={0} unreadNotifications={0} />}>
        <NavbarAuth />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}

async function NavbarAuth() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return <Navbar signedIn={false} walletBalance={0} unreadNotifications={0} />;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      walletBalance: true,
      _count: { select: { notifications: { where: { read: false } } } },
    },
  });

  return (
    <Navbar
      signedIn
      walletBalance={user?.walletBalance ?? 0}
      unreadNotifications={user?._count.notifications ?? 0}
    />
  );
}
