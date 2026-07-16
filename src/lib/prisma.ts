import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Prisma client connected DIRECTLY to Neon Postgres via the Neon serverless
 * driver adapter. The client is generated engine-less (driverAdapters +
 * queryCompiler), so there is no native query engine and no filesystem access
 * — it runs identically on Node (local dev) and Cloudflare Workers, with no
 * dependency on any hosted database platform.
 */
function createPrisma(): PrismaClient {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL ?? "" });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
