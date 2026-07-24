"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { recordActivity } from "@/lib/activity";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

async function requireUserId() {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

export async function createForumTopic(input: {
  categorySlug: string;
  title: string;
  body: string;
  kind?: string;
}): Promise<{ ok: boolean; error?: string; slug?: string }> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Sign in to post." };

  const title = input.title.trim();
  const body = input.body.trim();
  if (title.length < 5) return { ok: false, error: "Title too short." };
  if (body.length < 10) return { ok: false, error: "Body too short." };

  const category = await prisma.forumCategory.findUnique({ where: { slug: input.categorySlug } });
  if (!category) return { ok: false, error: "Category not found." };

  const base = slugify(title) || "topic";
  const slug = `${base}-${Date.now().toString(36)}`;
  const kind = input.kind?.trim() || "discussion";

  await prisma.forumTopic.create({
    data: {
      categoryId: category.id,
      authorId: userId,
      title,
      slug,
      body,
      kind,
      lastReplyAt: new Date(),
    },
  });

  await prisma.forumCategory.update({
    where: { id: category.id },
    data: { topicCount: { increment: 1 } },
  });

  await recordActivity({
    type: "forum_topic",
    title: `New ${kind}: ${title}`,
    body: category.name,
    href: `/community/${category.slug}/${slug}`,
    userId,
  });

  await writeAudit(userId, "forum.topic", { slug, category: category.slug });
  revalidatePath("/community");
  revalidatePath(`/community/${category.slug}`);
  return { ok: true, slug };
}

export async function replyToTopic(input: {
  topicSlug: string;
  body: string;
  imageUrl?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Sign in to reply." };

  const body = input.body.trim();
  if (body.length < 2) return { ok: false, error: "Reply too short." };

  const topic = await prisma.forumTopic.findUnique({
    where: { slug: input.topicSlug },
    include: { category: true },
  });
  if (!topic) return { ok: false, error: "Topic not found." };
  if (topic.locked) return { ok: false, error: "Topic is locked." };

  await prisma.forumPost.create({
    data: {
      topicId: topic.id,
      authorId: userId,
      body,
      imageUrl: input.imageUrl?.trim() || null,
    },
  });

  await prisma.forumTopic.update({
    where: { id: topic.id },
    data: {
      replyCount: { increment: 1 },
      lastReplyAt: new Date(),
    },
  });

  const mentions = Array.from(body.matchAll(/@([a-zA-Z0-9_]{3,24})/g)).map((m) => m[1].toLowerCase());
  if (mentions.length) {
    const users = await prisma.user.findMany({
      where: { username: { in: mentions, mode: "insensitive" } },
      select: { id: true },
    });
    for (const u of users) {
      if (u.id === userId) continue;
      await prisma.notification.create({
        data: {
          userId: u.id,
          title: "You were mentioned",
          body: `In “${topic.title}”`,
        },
      });
    }
  }

  revalidatePath(`/community/${topic.category.slug}/${topic.slug}`);
  return { ok: true };
}

export async function reactToPost(input: {
  postId: string;
  emoji: string;
}): Promise<{ ok: boolean; error?: string }> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Sign in." };

  const emoji = ["like", "fire", "helpful", "wow"].includes(input.emoji) ? input.emoji : "like";

  const existing = await prisma.forumReaction.findFirst({
    where: { postId: input.postId, userId, emoji },
  });
  if (existing) {
    await prisma.forumReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.forumReaction.create({
      data: { postId: input.postId, userId, emoji },
    });
  }
  return { ok: true };
}

export async function ensureForumSeeded() {
  const count = await prisma.forumCategory.count();
  if (count > 0) return;
  const cats = [
    { slug: "marketplace", name: "Marketplace", description: "Listings, deals, and trading talk", sortOrder: 0 },
    { slug: "guides", name: "Guides", description: "How-tos and walkthroughs", sortOrder: 1 },
    { slug: "questions", name: "Q&A", description: "Ask the community", sortOrder: 2 },
    { slug: "services", name: "Services", description: "Offer or find digital services", sortOrder: 3 },
    { slug: "gaming", name: "Gaming", description: "Games, accounts, and ranks", sortOrder: 4 },
    { slug: "ai", name: "AI", description: "ChatGPT, Claude, Midjourney & more", sortOrder: 5 },
    { slug: "software", name: "Software", description: "Tools, licenses, and stacks", sortOrder: 6 },
    { slug: "hosting", name: "Hosting", description: "Servers, domains, VPNs", sortOrder: 7 },
    { slug: "programming", name: "Programming", description: "Dev talk and snippets", sortOrder: 8 },
  ];
  await prisma.forumCategory.createMany({ data: cats });
}
