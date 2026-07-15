import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Prisma client with dual runtime support:
 *  - Node.js (local dev): the standard binary query engine.
 *  - Cloudflare Workers: the Neon serverless driver adapter, because Workers
 *    have no filesystem — the binary engine's `fs.readdir` throws there.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Robust Cloudflare Workers detection (multiple Worker-only signals). */
function isCloudflareWorkers(): boolean {
  const g = globalThis as {
    WebSocketPair?: unknown;
    navigator?: { userAgent?: string };
    caches?: { default?: unknown };
  };
  if (typeof g.WebSocketPair !== "undefined") return true;
  if (g.navigator?.userAgent === "Cloudflare-Workers") return true;
  if (g.caches && typeof g.caches === "object" && "default" in g.caches) return true;
  // Real Node exposes process.release.name === "node"; workerd does not.
  const release = (globalThis as { process?: { release?: { name?: string } } }).process?.release;
  if (typeof process !== "undefined" && release?.name !== "node") return true;
  return false;
}

function createPrisma(): PrismaClient {
  if (isCloudflareWorkers()) {
    const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL ?? "" });
    return new PrismaClient({ adapter });
  }
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
