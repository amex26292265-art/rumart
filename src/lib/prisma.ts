import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";

/**
 * Prisma client connected DIRECTLY to Neon Postgres via the Neon serverless
 * driver adapter. Engine-less (driverAdapters + queryCompiler), so it runs on
 * Cloudflare Workers with no native engine and no hosted DB platform.
 *
 * `poolQueryViaFetch = true` routes every query over stateless HTTP instead of
 * a persistent WebSocket. This is REQUIRED on Cloudflare Workers: a WebSocket
 * connection is an I/O object bound to the request that created it, and reusing
 * a global client across requests otherwise throws "Cannot perform I/O on
 * behalf of a different request". HTTP queries are created per-query in the
 * current request's context, so a shared client is safe.
 */
neonConfig.poolQueryViaFetch = true;

function createPrisma(): PrismaClient {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL ?? "" });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
