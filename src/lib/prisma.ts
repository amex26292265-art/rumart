import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Engine-less Prisma client (generated with queryCompiler + driverAdapters):
 * pure TypeScript, no binary/WASM engine, no filesystem. It runs identically on
 * Node (local dev) and Cloudflare Workers, always through the Neon serverless
 * driver adapter. This is what avoids the Worker's `fs.readdir` crash.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma(): PrismaClient {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL ?? "" });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
