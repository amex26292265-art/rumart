import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/account";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login?next=/account/notifications");

  const notes = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <Container className="py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">Notifications</h1>
          <p className="mt-1 text-sm text-ink-500">Orders, wallet, and system updates</p>
        </div>
        <div className="flex items-center gap-3">
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="outline" size="sm">
              Mark all read
            </Button>
          </form>
          <Link href="/account" className="text-sm font-semibold text-accent-400">
            ← Account
          </Link>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500">No notifications yet.</div>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className={`card flex items-start justify-between gap-4 p-4 ${n.read ? "opacity-70" : "border-accent-500/30"}`}
            >
              <div>
                <p className="font-semibold text-ink-950">{n.title}</p>
                {n.body && <p className="mt-1 text-sm text-ink-500">{n.body}</p>}
                <p className="mt-2 text-xs text-ink-500">{n.createdAt.toLocaleString()}</p>
              </div>
              {!n.read && (
                <form
                  action={async () => {
                    "use server";
                    await markNotificationRead(n.id);
                  }}
                >
                  <Button type="submit" variant="ghost" size="sm">
                    Mark read
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
