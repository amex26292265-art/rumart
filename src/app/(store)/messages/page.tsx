import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Container } from "@/components/ui/container";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Slim inbox list — ConversationView removed to its own route. */
export default async function MessagesPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login?next=/messages");

  const parts = await prisma.conversationParticipant.findMany({
    where: { userId },
    orderBy: { conversation: { updatedAt: "desc" } },
    include: {
      conversation: {
        include: {
          participants: {
            include: { user: { select: { id: true, name: true, username: true, email: true } } },
          },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  return (
    <Container className="py-10 md:py-14">
      <h1 className="font-display text-3xl font-bold text-ink-950">Messages</h1>
      <p className="mt-2 text-sm text-ink-600">Private conversations with buyers and sellers.</p>

      <ul className="mt-8 divide-y divide-mist-300/60 rounded-2xl border border-mist-300/70 bg-mist-100/60">
        {parts.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-ink-500">
            No conversations yet. Message a seller from their profile.
          </li>
        )}
        {parts.map((p) => {
          const others = p.conversation.participants.filter((x) => x.userId !== userId);
          const label =
            others.map((o) => o.user.username || o.user.name || o.user.email).join(", ") ||
            "Conversation";
          const last = p.conversation.messages[0];
          const unread =
            last && last.senderId !== userId && (!p.lastReadAt || last.createdAt > p.lastReadAt);
          return (
            <li key={p.conversationId}>
              <Link
                href={`/messages/${p.conversationId}`}
                className="flex items-start justify-between gap-3 px-4 py-4 hover:bg-mist-200/50"
              >
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm ${unread ? "font-semibold text-ink-950" : "text-ink-800"}`}
                  >
                    {label}
                  </p>
                  <p className="mt-1 truncate text-xs text-ink-500">
                    {last?.body ?? "No messages"} · {p.conversation.kind}
                    {p.conversation.orderRef ? ` · ${p.conversation.orderRef}` : ""}
                  </p>
                </div>
                {unread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent-500" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
