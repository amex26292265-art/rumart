import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { MessageSquare, Plus } from "lucide-react";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function ForumCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = await prisma.forumCategory.findUnique({ where: { slug } });
  if (!category) notFound();

  const session = await auth();
  const signedIn = Boolean((session?.user as { id?: string } | undefined)?.id);

  const topics = await prisma.forumTopic.findMany({
    where: { categoryId: category.id },
    orderBy: [{ pinned: "desc" }, { lastReplyAt: "desc" }, { createdAt: "desc" }],
    take: 40,
    include: { author: { select: { name: true, username: true } } },
  });

  return (
    <Container className="py-10 md:py-14">
      <Link href="/community" className="text-sm text-accent-400 hover:underline">
        ← Community
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">{category.name}</h1>
          {category.description && <p className="mt-2 text-ink-600">{category.description}</p>}
        </div>
        <Link href={signedIn ? "/community/new" : `/login?next=/community/new`}>
          <Button>
            <Plus className="h-4 w-4" /> New topic
          </Button>
        </Link>
      </div>

      <ul className="mt-8 divide-y divide-mist-300/60 rounded-2xl border border-mist-300/70 bg-mist-100/60">
        {topics.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-ink-500">No topics in this category yet.</li>
        )}
        {topics.map((t) => (
          <li key={t.id}>
            <Link
              href={`/community/${slug}/${t.slug}`}
              className="flex items-start gap-3 px-4 py-4 hover:bg-mist-200/50"
            >
              <MessageSquare className="mt-1 h-4 w-4 text-accent-400" />
              <div>
                <p className="font-medium text-ink-950">{t.title}</p>
                <p className="mt-1 text-xs text-ink-500">
                  {t.kind} · @{t.author.username || t.author.name || "member"} · {t.replyCount} replies
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
