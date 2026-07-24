import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { Container } from "@/components/ui/container";
import { prisma } from "@/lib/prisma";
import { markConversationRead } from "@/app/actions/social";
import { MessageComposer } from "../MessageComposer";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: conversationId } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect(`/login?next=/messages/${conversationId}`);

  const part = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!part) notFound();

  await markConversationRead(conversationId);

  const conversation = await prisma.conversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, username: true } } },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 200,
        include: { sender: { select: { id: true, name: true, username: true } } },
      },
    },
  });

  const typingOther = conversation.participants.find(
    (p) => p.userId !== userId && p.typingAt && Date.now() - p.typingAt.getTime() < 8_000,
  );

  return (
    <Container className="max-w-2xl py-10">
      <Link href="/messages" className="text-sm text-accent-400 hover:underline">
        ← Inbox
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold text-ink-950">
        {conversation.subject ||
          conversation.participants
            .filter((p) => p.userId !== userId)
            .map((p) => p.user.username || p.user.name || "user")
            .join(", ") ||
          "Conversation"}
      </h1>
      {conversation.orderRef && (
        <p className="mt-1 text-xs text-ink-500">Order · {conversation.orderRef}</p>
      )}
      <div className="mt-6 max-h-[55vh] space-y-3 overflow-y-auto rounded-2xl border border-mist-300/70 bg-mist-100/50 p-4">
        {conversation.messages.map((m) => {
          const mine = m.senderId === userId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-accent-600/30 text-ink-950" : "bg-mist-200 text-ink-800"
                }`}
              >
                {!mine && (
                  <p className="mb-1 text-[0.65rem] text-ink-500">
                    @{m.sender.username || m.sender.name || "user"}
                  </p>
                )}
                <p className="whitespace-pre-wrap">{m.body}</p>
                {m.attachmentUrl && (
                  <a
                    href={m.attachmentUrl}
                    className="mt-1 block text-xs text-accent-400 underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Attachment
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {typingOther && <p className="mt-2 text-xs text-ink-500">Someone is typing…</p>}
      <div className="mt-4">
        <MessageComposer conversationId={conversationId} />
      </div>
    </Container>
  );
}
