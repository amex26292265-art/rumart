import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          walletBalance: true,
          notifications: { where: { read: false }, select: { id: true }, take: 20 },
        },
      })
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Navbar
        signedIn={Boolean(userId)}
        walletBalance={user?.walletBalance ?? 0}
        unreadNotifications={user?.notifications.length ?? 0}
      />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
