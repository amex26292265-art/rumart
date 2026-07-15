import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

/**
 * Prisma client over Prisma Accelerate: every query is a plain HTTPS call to
 * accelerate.prisma.io (DATABASE_URL must be the prisma:// URL). No query
 * engine, no WASM, no filesystem — the only setup that is fully immune to
 * Cloudflare Workers' missing fs APIs. The same client runs on local Node dev.
 * Schema changes still go straight to Neon via DIRECT_DATABASE_URL (CLI only).
 *
 * The instance is typed as the base PrismaClient: the $extends() wrapper type
 * breaks query result inference when `orderBy` and `include` are combined
 * (results silently lose included relations / _count). The extension only
 * adds an optional `cacheStrategy` arg and `$accelerate.invalidate`, which we
 * don't use, so the base type is accurate for every call we make.
 */
function createPrisma(): PrismaClient {
  return new PrismaClient().$extends(withAccelerate()) as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
