import { prisma } from "@/lib/prisma";

/** Best-effort audit log writer — never throws into the caller's flow. */
export async function writeAudit(userId: string | null | undefined, action: string, meta?: unknown, ip?: string) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        meta: meta === undefined ? undefined : (meta as object),
        ip: ip || null,
      },
    });
  } catch (err) {
    console.error("[audit]", action, err);
  }
}
