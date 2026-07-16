import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/** Shared engine-less Prisma client for CLI scripts (direct Neon connection). */
export function makePrisma(): PrismaClient {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL ?? "" });
  return new PrismaClient({ adapter });
}
