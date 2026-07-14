import { PrismaClient } from "@prisma/client";

/**
 * Prisma client with dual runtime support:
 *  - Node.js (local dev, Vercel): the standard binary query engine.
 *  - Cloudflare Workers: the Neon serverless driver adapter, because Workers
 *    can't run Prisma's native binary engine.
 *
 * Detected via `navigator.userAgent` which Cloudflare Workers set to
 * "Cloudflare-Workers". The adapter path is loaded lazily so Node builds don't
 * pull the Workers-only driver.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const onCloudflare =
  typeof navigator !== "undefined" &&
  (navigator as { userAgent?: string }).userAgent === "Cloudflare-Workers";

function createPrisma(): PrismaClient {
  if (onCloudflare) {
    // Lazy requires so bundlers don't include these on the Node path.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaNeon } = require("@prisma/adapter-neon");
    const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
    return new PrismaClient({ adapter });
  }
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
