import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Container } from "@/components/ui/container";
import { prisma } from "@/lib/prisma";
import { TopicReplyForm, ReactionBar } from "../TopicActions";

export const dynamic = "force-dynamic";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ category: string; topic: string }>;
}) {
  const { category: catSlug, topic: topicSlug } = await params;
  const topic = await prisma.forumTopic.findUnique({
    where: { slug: topicSlug },
    include: {
      category: true,
      author: { select: { id: true, name: true, username: true, avatarUrl: true } },
      posts: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, username: true, avatarUrl: true } },
          reactions: true,
        },
      },
    },
  });
  if (!topic || topic.category.slug !== catSlug) notFound();

  // Increment views (best-effort)
  await prisma.forumTopic.update({ where: { id: topic.id }, data: { views: { increment: 1 } } }).catch(() => {});

  const session = await auth();
  const signedIn = Boolean((session?.user as { id?: string } | undefined)?.id);

  const reactionSummary = (reactions: { emoji: string }[]) => {
    const map = new Map<string, number>();
    for (const r of reactions) map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([e, n]) => `${e}:${n}`)
      .join(" · ");
  };

  return (
    <Container className="max-w-3xl py-10 md:py-14">
      <Link href={`/community/${catSlug}`} className="text-sm text-accent-400 hover:underline">
        ← {topic.category.name}
      </Link>
      <div className="mt-4">
        <span className="rounded-full border border-accent-500/30 bg-accent-600/10 px-2.5 py-0.5 text-xs text-accent-400">
          {topic.kind}
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold text-ink-950">{topic.title}</h1>
        <p className="mt-2 text-sm text-ink-500">
          by{" "}
          <Link
            href={topic.author.username ? `/u/${topic.author.username}` : `/u/id/${topic.author.id}`}
            className="text-accent-400 hover:underline"
          >
            @{topic.author.username || topic.author.name || "member"}
          </Link>{" "}
          · {topic.views + 1} views · {topic.replyCount} replies
        </p>
      </div>

      <article className="mt-8 rounded-2xl border border-mist-300/70 bg-mist-100 p-5">
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink-800">{topic.body}</div>
      </article>

      <div className="mt-8 space-y-4">
        <h2 className="font-display text-xl font-semibold text-ink-950">Replies</h2>
        {topic.posts.length === 0 && (
          <p className="text-sm text-ink-500">No replies yet — start the conversation.</p>
        )}
        {topic.posts.map((p) => (
          <div key={p.id} className="rounded-2xl border border-mist-300/60 bg-mist-100/80 p-4">
            <div className="flex items-center justify-between gap-2 text-xs text-ink-500">
              <Link
                href={p.author.username ? `/u/${p.author.username}` : `/u/id/${p.author.id}`}
                className="font-medium text-accent-400 hover:underline"
              >
                @{p.author.username || p.author.name || "member"}
              </Link>
              <time dateTime={p.createdAt.toISOString()}>{p.createdAt.toLocaleString()}</time>
            </div>
            <div className="mt-2 whitespace-pre-wrap text-sm text-ink-800">{p.body}</div>
            {p.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt="" className="mt-3 max-h-64 rounded-xl border border-mist-300" />
            )}
            {p.reactions.length > 0 && (
              <p className="mt-2 text-xs text-ink-500">{reactionSummary(p.reactions)}</p>
            )}
            {signedIn && <ReactionBar postId={p.id} />}
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-mist-300/70 bg-mist-100 p-5">
        <h3 className="mb-3 font-medium text-ink-950">Reply</h3>
        <TopicReplyForm topicSlug={topic.slug} signedIn={signedIn} />
      </div>
    </Container>
  );
}
