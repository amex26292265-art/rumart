import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * One-shot schema upgrade for Rumart v2 columns/tables.
 * Protected by MIGRATE_SECRET (or CRON_SECRET) bearer token.
 * Safe to re-run (IF NOT EXISTS).
 */
export async function POST(request: Request) {
  const secret = process.env.MIGRATE_SECRET || process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "MIGRATE_SECRET not set" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const steps: string[] = [];
  const run = async (label: string, sql: string) => {
    try {
      await prisma.$executeRawUnsafe(sql);
      steps.push(`ok: ${label}`);
    } catch (err) {
      steps.push(`fail: ${label} — ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Product v2 columns
  await run(
    "product.sourceType",
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sourceType" TEXT NOT NULL DEFAULT 'lzt'`,
  );
  await run(
    "product.credentialStock",
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "credentialStock" TEXT`,
  );
  await run(
    "product.sellerId",
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sellerId" TEXT`,
  );

  // Review moderation columns
  await run(
    "review.status",
    `ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'published'`,
  );
  await run(
    "review.helpful",
    `ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "helpful" INTEGER NOT NULL DEFAULT 0`,
  );
  await run(
    "review.verified",
    `ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT false`,
  );

  // Seller tables
  await run(
    "SellerApplication",
    `CREATE TABLE IF NOT EXISTS "SellerApplication" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "displayName" TEXT NOT NULL,
      "bio" TEXT,
      "experience" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "adminNote" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );
  await run(
    "SellerProfile",
    `CREATE TABLE IF NOT EXISTS "SellerProfile" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL UNIQUE,
      "slug" TEXT NOT NULL UNIQUE,
      "displayName" TEXT NOT NULL,
      "bio" TEXT,
      "badge" TEXT NOT NULL DEFAULT 'seller',
      "verified" BOOLEAN NOT NULL DEFAULT false,
      "status" TEXT NOT NULL DEFAULT 'active',
      "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "ratingCount" INTEGER NOT NULL DEFAULT 0,
      "salesCount" INTEGER NOT NULL DEFAULT 0,
      "earnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );
  await run(
    "SellerPayout",
    `CREATE TABLE IF NOT EXISTS "SellerPayout" (
      "id" TEXT PRIMARY KEY,
      "sellerId" TEXT NOT NULL,
      "amount" DOUBLE PRECISION NOT NULL,
      "method" TEXT NOT NULL DEFAULT 'manual',
      "status" TEXT NOT NULL DEFAULT 'pending',
      "note" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  // Indexes / FKs (best-effort)
  await run(
    "idx product sourceType",
    `CREATE INDEX IF NOT EXISTS "Product_sourceType_status_idx" ON "Product"("sourceType", "status")`,
  );
  await run(
    "idx product sellerId",
    `CREATE INDEX IF NOT EXISTS "Product_sellerId_idx" ON "Product"("sellerId")`,
  );
  await run(
    "idx seller app status",
    `CREATE INDEX IF NOT EXISTS "SellerApplication_status_createdAt_idx" ON "SellerApplication"("status", "createdAt")`,
  );
  await run(
    "idx seller payout",
    `CREATE INDEX IF NOT EXISTS "SellerPayout_sellerId_status_idx" ON "SellerPayout"("sellerId", "status")`,
  );
  await run(
    "idx notification user read",
    `CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read")`,
  );
  await run(
    "category logoUrl",
    `ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT`,
  );
  await run(
    "category bannerUrl",
    `ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "bannerUrl" TEXT`,
  );

  // Foreign keys — ignore if already exist
  await run(
    "fk SellerApplication.userId",
    `DO $$ BEGIN
      ALTER TABLE "SellerApplication" ADD CONSTRAINT "SellerApplication_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  );
  await run(
    "fk SellerProfile.userId",
    `DO $$ BEGIN
      ALTER TABLE "SellerProfile" ADD CONSTRAINT "SellerProfile_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  );
  await run(
    "fk SellerPayout.sellerId",
    `DO $$ BEGIN
      ALTER TABLE "SellerPayout" ADD CONSTRAINT "SellerPayout_sellerId_fkey"
        FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  );
  await run(
    "fk Product.sellerId",
    `DO $$ BEGIN
      ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey"
        FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  );

  // Seed AI categories if missing (minimal)
  await run(
    "supplier manual",
    `INSERT INTO "Supplier" ("id", "slug", "name", "enabled", "createdAt")
     SELECT gen_random_uuid()::text, 'manual', 'Manual / Custom', true, CURRENT_TIMESTAMP
     WHERE NOT EXISTS (SELECT 1 FROM "Supplier" WHERE "slug" = 'manual')`,
  );

  // ─── Rumart V3: profiles, forum, messaging, activity ─────────────────────
  for (const col of [
    ["username", "TEXT"],
    ["bio", "TEXT"],
    ["avatarUrl", "TEXT"],
    ["bannerUrl", "TEXT"],
    ["discord", "TEXT"],
    ["telegram", "TEXT"],
    ["website", "TEXT"],
    ["country", "TEXT"],
  ] as const) {
    await run(`user.${col[0]}`, `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "${col[0]}" ${col[1]}`);
  }
  await run(
    "user.username unique",
    `CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username")`,
  );

  for (const col of [
    ["categories", "TEXT"],
    ["country", "TEXT"],
    ["portfolio", "TEXT"],
    ["discord", "TEXT"],
    ["telegram", "TEXT"],
    ["website", "TEXT"],
    ["reason", "TEXT"],
  ] as const) {
    await run(
      `sellerApp.${col[0]}`,
      `ALTER TABLE "SellerApplication" ADD COLUMN IF NOT EXISTS "${col[0]}" ${col[1]}`,
    );
  }
  await run(
    "sellerProfile.level",
    `ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "level" INTEGER NOT NULL DEFAULT 1`,
  );
  await run(
    "sellerProfile.reputation",
    `ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "reputation" INTEGER NOT NULL DEFAULT 0`,
  );
  await run(
    "sellerProfile.followerCount",
    `ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "followerCount" INTEGER NOT NULL DEFAULT 0`,
  );

  await run(
    "ForumCategory",
    `CREATE TABLE IF NOT EXISTS "ForumCategory" (
      "id" TEXT PRIMARY KEY,
      "slug" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "icon" TEXT,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "topicCount" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );
  await run(
    "ForumTopic",
    `CREATE TABLE IF NOT EXISTS "ForumTopic" (
      "id" TEXT PRIMARY KEY,
      "categoryId" TEXT NOT NULL,
      "authorId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "slug" TEXT NOT NULL UNIQUE,
      "body" TEXT NOT NULL,
      "kind" TEXT NOT NULL DEFAULT 'discussion',
      "pinned" BOOLEAN NOT NULL DEFAULT false,
      "locked" BOOLEAN NOT NULL DEFAULT false,
      "views" INTEGER NOT NULL DEFAULT 0,
      "replyCount" INTEGER NOT NULL DEFAULT 0,
      "lastReplyAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );
  await run(
    "ForumPost",
    `CREATE TABLE IF NOT EXISTS "ForumPost" (
      "id" TEXT PRIMARY KEY,
      "topicId" TEXT NOT NULL,
      "authorId" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "imageUrl" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );
  await run(
    "ForumReaction",
    `CREATE TABLE IF NOT EXISTS "ForumReaction" (
      "id" TEXT PRIMARY KEY,
      "postId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "emoji" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );
  await run(
    "Follow",
    `CREATE TABLE IF NOT EXISTS "Follow" (
      "id" TEXT PRIMARY KEY,
      "followerId" TEXT NOT NULL,
      "followingId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );
  await run(
    "Conversation",
    `CREATE TABLE IF NOT EXISTS "Conversation" (
      "id" TEXT PRIMARY KEY,
      "kind" TEXT NOT NULL DEFAULT 'dm',
      "orderRef" TEXT,
      "subject" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );
  await run(
    "ConversationParticipant",
    `CREATE TABLE IF NOT EXISTS "ConversationParticipant" (
      "id" TEXT PRIMARY KEY,
      "conversationId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "lastReadAt" TIMESTAMP(3),
      "typingAt" TIMESTAMP(3),
      "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );
  await run(
    "Message",
    `CREATE TABLE IF NOT EXISTS "Message" (
      "id" TEXT PRIMARY KEY,
      "conversationId" TEXT NOT NULL,
      "senderId" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "attachmentUrl" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );
  await run(
    "ActivityEvent",
    `CREATE TABLE IF NOT EXISTS "ActivityEvent" (
      "id" TEXT PRIMARY KEY,
      "type" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "body" TEXT,
      "href" TEXT,
      "meta" TEXT,
      "userId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );

  await run("idx ForumTopic cat", `CREATE INDEX IF NOT EXISTS "ForumTopic_categoryId_lastReplyAt_idx" ON "ForumTopic"("categoryId", "lastReplyAt")`);
  await run("idx ForumTopic created", `CREATE INDEX IF NOT EXISTS "ForumTopic_createdAt_idx" ON "ForumTopic"("createdAt")`);
  await run("idx ForumPost topic", `CREATE INDEX IF NOT EXISTS "ForumPost_topicId_createdAt_idx" ON "ForumPost"("topicId", "createdAt")`);
  await run("uq ForumReaction", `CREATE UNIQUE INDEX IF NOT EXISTS "ForumReaction_postId_userId_emoji_key" ON "ForumReaction"("postId", "userId", "emoji")`);
  await run("uq Follow", `CREATE UNIQUE INDEX IF NOT EXISTS "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId")`);
  await run("idx Follow following", `CREATE INDEX IF NOT EXISTS "Follow_followingId_idx" ON "Follow"("followingId")`);
  await run("uq ConvPart", `CREATE UNIQUE INDEX IF NOT EXISTS "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId")`);
  await run("idx ConvPart user", `CREATE INDEX IF NOT EXISTS "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId")`);
  await run("idx Message conv", `CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt")`);
  await run("idx Activity created", `CREATE INDEX IF NOT EXISTS "ActivityEvent_createdAt_idx" ON "ActivityEvent"("createdAt")`);
  await run("idx Activity type", `CREATE INDEX IF NOT EXISTS "ActivityEvent_type_createdAt_idx" ON "ActivityEvent"("type", "createdAt")`);

  for (const [label, sql] of [
    ["fk ForumTopic.categoryId", `"ForumTopic" ADD CONSTRAINT "ForumTopic_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ForumCategory"("id") ON DELETE CASCADE`],
    ["fk ForumTopic.authorId", `"ForumTopic" ADD CONSTRAINT "ForumTopic_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE`],
    ["fk ForumPost.topicId", `"ForumPost" ADD CONSTRAINT "ForumPost_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ForumTopic"("id") ON DELETE CASCADE`],
    ["fk ForumPost.authorId", `"ForumPost" ADD CONSTRAINT "ForumPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE`],
    ["fk ForumReaction.postId", `"ForumReaction" ADD CONSTRAINT "ForumReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE`],
    ["fk ForumReaction.userId", `"ForumReaction" ADD CONSTRAINT "ForumReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE`],
    ["fk Follow.followerId", `"Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE`],
    ["fk Follow.followingId", `"Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE`],
    ["fk ConvPart.conversationId", `"ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE`],
    ["fk ConvPart.userId", `"ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE`],
    ["fk Message.conversationId", `"Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE`],
    ["fk Message.senderId", `"Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE`],
    ["fk ActivityEvent.userId", `"ActivityEvent" ADD CONSTRAINT "ActivityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL`],
  ] as const) {
    await run(
      label,
      `DO $$ BEGIN ALTER TABLE ${sql}; EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
  }

  // Seed forum categories
  const forumCats: [string, string, string, number][] = [
    ["marketplace", "Marketplace", "Listings, deals, and trading talk", 0],
    ["guides", "Guides", "How-tos and walkthroughs", 1],
    ["questions", "Q&A", "Ask the community", 2],
    ["services", "Services", "Offer or find digital services", 3],
    ["gaming", "Gaming", "Games, accounts, and ranks", 4],
    ["ai", "AI", "ChatGPT, Claude, Midjourney & more", 5],
    ["software", "Software", "Tools, licenses, and stacks", 6],
    ["hosting", "Hosting", "Servers, domains, VPNs", 7],
    ["programming", "Programming", "Dev talk and snippets", 8],
  ];
  for (const [slug, name, description, sortOrder] of forumCats) {
    await run(
      `forum seed ${slug}`,
      `INSERT INTO "ForumCategory" ("id", "slug", "name", "description", "sortOrder", "topicCount", "createdAt")
       SELECT gen_random_uuid()::text, '${slug}', '${name}', '${description}', ${sortOrder}, 0, CURRENT_TIMESTAMP
       WHERE NOT EXISTS (SELECT 1 FROM "ForumCategory" WHERE "slug" = '${slug}')`,
    );
  }

  const failed = steps.filter((s) => s.startsWith("fail"));
  return NextResponse.json({
    ok: failed.length === 0,
    steps,
    failed: failed.length,
  });
}

export async function GET(request: Request) {
  return POST(request);
}
