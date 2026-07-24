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

  // Update admin email/password is handled via Worker secrets + seed login.

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
