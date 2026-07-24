"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

async function requireUserId() {
  const session = await auth();
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

const SPAM_WINDOW_MS = 8_000;
const lastSend = new Map<string, number>();

function spamCheck(userId: string): string | null {
  const now = Date.now();
  const prev = lastSend.get(userId) ?? 0;
  if (now - prev < SPAM_WINDOW_MS) return "Slow down — spam protection.";
  lastSend.set(userId, now);
  return null;
}

export async function startConversation(input: {
  recipientId: string;
  body: string;
  subject?: string;
  orderRef?: string;
}): Promise<{ ok: boolean; error?: string; conversationId?: string }> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Sign in." };
  if (input.recipientId === userId) return { ok: false, error: "Cannot message yourself." };

  const body = input.body.trim();
  if (body.length < 1) return { ok: false, error: "Message required." };
  const spam = spamCheck(userId);
  if (spam) return { ok: false, error: spam };

  const recipient = await prisma.user.findUnique({ where: { id: input.recipientId }, select: { id: true } });
  if (!recipient) return { ok: false, error: "User not found." };

  // Reuse existing DM between the two users
  const existing = await prisma.conversation.findFirst({
    where: {
      kind: input.orderRef ? "order" : "dm",
      orderRef: input.orderRef ?? null,
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: input.recipientId } } },
      ],
    },
    select: { id: true },
  });

  let conversationId = existing?.id;
  if (!conversationId) {
    const conv = await prisma.conversation.create({
      data: {
        kind: input.orderRef ? "order" : "dm",
        orderRef: input.orderRef ?? null,
        subject: input.subject?.trim() || null,
        participants: {
          create: [{ userId }, { userId: input.recipientId }],
        },
      },
    });
    conversationId = conv.id;
  }

  await prisma.message.create({
    data: { conversationId, senderId: userId, body },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
  await prisma.notification.create({
    data: {
      userId: input.recipientId,
      title: "New message",
      body: body.slice(0, 120),
    },
  });

  await writeAudit(userId, "message.send", { conversationId });
  revalidatePath("/messages");
  return { ok: true, conversationId };
}

export async function sendMessage(input: {
  conversationId: string;
  body: string;
  attachmentUrl?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Sign in." };

  const body = input.body.trim();
  if (body.length < 1 && !input.attachmentUrl) return { ok: false, error: "Empty message." };
  const spam = spamCheck(userId);
  if (spam) return { ok: false, error: spam };

  const part = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId: input.conversationId, userId },
    },
  });
  if (!part) return { ok: false, error: "Not a participant." };

  await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      senderId: userId,
      body: body || "(attachment)",
      attachmentUrl: input.attachmentUrl?.trim() || null,
    },
  });
  await prisma.conversation.update({
    where: { id: input.conversationId },
    data: { updatedAt: new Date() },
  });

  const others = await prisma.conversationParticipant.findMany({
    where: { conversationId: input.conversationId, NOT: { userId } },
    select: { userId: true },
  });
  for (const o of others) {
    await prisma.notification.create({
      data: { userId: o.userId, title: "New message", body: body.slice(0, 120) },
    });
  }

  revalidatePath(`/messages/${input.conversationId}`);
  revalidatePath("/messages");
  return { ok: true };
}

export async function markConversationRead(conversationId: string) {
  const userId = await requireUserId();
  if (!userId) return;
  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: { lastReadAt: new Date(), typingAt: null },
  });
}

export async function setTyping(conversationId: string) {
  const userId = await requireUserId();
  if (!userId) return;
  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: { typingAt: new Date() },
  });
}

export async function followUser(targetId: string): Promise<{ ok: boolean; error?: string; following?: boolean }> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Sign in." };
  if (targetId === userId) return { ok: false, error: "Cannot follow yourself." };

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: userId, followingId: targetId } },
  });
  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return { ok: true, following: false };
  }
  await prisma.follow.create({ data: { followerId: userId, followingId: targetId } });
  await prisma.notification.create({
    data: { userId: targetId, title: "New follower", body: "Someone started following you." },
  });
  return { ok: true, following: true };
}

export async function updateProfile(input: {
  username?: string;
  name?: string;
  bio?: string;
  discord?: string;
  telegram?: string;
  website?: string;
  country?: string;
  avatarUrl?: string;
  bannerUrl?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Sign in." };

  let username = input.username?.trim().toLowerCase() || undefined;
  if (username) {
    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      return { ok: false, error: "Username: 3–24 chars, letters/numbers/_ only." };
    }
    const taken = await prisma.user.findFirst({
      where: { username, NOT: { id: userId } },
      select: { id: true },
    });
    if (taken) return { ok: false, error: "Username taken." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(username !== undefined ? { username } : {}),
      name: input.name?.trim() || undefined,
      bio: input.bio?.trim() || null,
      discord: input.discord?.trim() || null,
      telegram: input.telegram?.trim() || null,
      website: input.website?.trim() || null,
      country: input.country?.trim() || null,
      avatarUrl: input.avatarUrl?.trim() || null,
      bannerUrl: input.bannerUrl?.trim() || null,
    },
  });

  revalidatePath("/account");
  revalidatePath(`/u/${username || "me"}`);
  return { ok: true };
}
