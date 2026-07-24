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
      <Suspense
        fallback={
          <Navbar signedIn={false} walletBalance={0} unreadNotifications={0} unreadMessages={0} />
        }
      >
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
    return <Navbar signedIn={false} walletBalance={0} unreadNotifications={0} unreadMessages={0} />;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      walletBalance: true,
      _count: { select: { notifications: { where: { read: false } } } },
    },
  });

  let unreadMessages = 0;
  try {
    const parts = await prisma.conversationParticipant.findMany({
      where: { userId },
      select: {
        lastReadAt: true,
        conversation: {
          select: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { senderId: true, createdAt: true },
            },
          },
        },
      },
    });
    unreadMessages = parts.filter((p) => {
      const last = p.conversation.messages[0];
      if (!last || last.senderId === userId) return false;
      return !p.lastReadAt || last.createdAt > p.lastReadAt;
    }).length;
  } catch {
    unreadMessages = 0;
  }

  return (
    <Navbar
      signedIn
      walletBalance={user?.walletBalance ?? 0}
      unreadNotifications={user?._count.notifications ?? 0}
      unreadMessages={unreadMessages}
    />
  );
}
