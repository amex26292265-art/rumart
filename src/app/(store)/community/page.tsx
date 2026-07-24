import Link from "next/link";
import { auth } from "@/auth";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ensureForumSeeded } from "@/app/actions/forum";
import { prisma } from "@/lib/prisma";
import { MessageSquare, Pin, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Community — Rumart",
  description: "Forum, guides, Q&A, and marketplace discussions inside Rumart.",
};

export default async function CommunityPage() {
  await ensureForumSeeded().catch(() => {});
  const session = await auth();
  const signedIn = Boolean((session?.user as { id?: string } | undefined)?.id);

  const [categories, recent] = await Promise.all([
    prisma.forumCategory.findMany({ orderBy: { sortOrder: "asc" } }).catch(() => []),
    prisma.forumTopic
      .findMany({
        orderBy: [{ pinned: "desc" }, { lastReplyAt: "desc" }, { createdAt: "desc" }],
        take: 12,
        include: {
          category: { select: { slug: true, name: true } },
          author: { select: { name: true, username: true } },
        },
      })
      .catch(() => []),
  ]);

  return (
    <Container className="py-10 md:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-400">Community</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink-950 md:text-4xl">
            Discussions inside the ecosystem
          </h1>
          <p className="mt-2 max-w-xl text-ink-600">
            Guides, Q&A, services, gaming, AI, software, hosting — integrated with the marketplace.
          </p>
        </div>
        {signedIn ? (
          <Link href="/community/new">
            <Button>
              <Plus className="h-4 w-4" /> New topic
            </Button>
          </Link>
        ) : (
          <Link href="/login?next=/community/new">
            <Button variant="outline">Sign in to post</Button>
          </Link>
        )}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-4">
          {categories.length === 0 && (
            <div className="rounded-2xl border border-dashed border-mist-300 p-4 text-sm text-ink-500">
              Forum categories will appear after the V3 schema migrate completes.
            </div>
          )}
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/community/${c.slug}`}
              className="block rounded-2xl border border-mist-300/70 bg-mist-100 p-4 transition-all hover:border-accent-500/40"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold text-ink-950">{c.name}</h2>
                <span className="text-xs text-ink-500">{c.topicCount}</span>
              </div>
              {c.description && <p className="mt-1 text-sm text-ink-500">{c.description}</p>}
            </Link>
          ))}
        </div>

        <div className="lg:col-span-8">
          <h2 className="mb-4 font-display text-xl font-semibold text-ink-950">Latest topics</h2>
          {recent.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-mist-300 p-8 text-center text-sm text-ink-500">
              No topics yet. Start the first discussion once the database is ready.
            </div>
          ) : (
            <ul className="divide-y divide-mist-300/60 rounded-2xl border border-mist-300/70 bg-mist-100/60">
              {recent.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/community/${t.category.slug}/${t.slug}`}
                    className="flex items-start gap-3 px-4 py-4 transition-colors hover:bg-mist-200/50"
                  >
                    <MessageSquare className="mt-1 h-4 w-4 shrink-0 text-accent-400" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink-950">
                        {t.pinned && <Pin className="mr-1 inline h-3.5 w-3.5 text-amber-300" />}
                        {t.title}
                      </p>
                      <p className="mt-1 text-xs text-ink-500">
                        {t.category.name} · {t.kind} · @{t.author.username || t.author.name || "member"} ·{" "}
                        {t.replyCount} replies · {t.views} views
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Container>
  );
}
