import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Prisma client with dual runtime support:
 *  - Node.js (local dev, Vercel): the standard binary query engine.
 *  - Cloudflare Workers: the Neon serverless driver adapter, because Workers
 *    can't run Prisma's native binary engine.
 *
 * Detected via `navigator.userAgent`, which Cloudflare Workers set to
 * "Cloudflare-Workers". Uses a static import (not require) so it works in the
 * Worker's ESM runtime.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const onCloudflare =
  typeof navigator !== "undefined" &&
  (navigator as { userAgent?: string }).userAgent === "Cloudflare-Workers";

function createPrisma(): PrismaClient {
  if (onCloudflare) {
    const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL ?? "" });
    return new PrismaClient({ adapter });
  }
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
