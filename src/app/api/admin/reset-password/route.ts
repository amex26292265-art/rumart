import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

/**
 * One-shot admin password reset.
 * Auth: Bearer MIGRATE_SECRET or CRON_SECRET
 * Body JSON: { email?, password }
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

  let body: { email?: string; password?: string } = {};
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    body = {};
  }

  const email = (body.email || process.env.ADMIN_EMAIL || "admin@rumart.xyz").toLowerCase().trim();
  const password = body.password?.trim();
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "password must be at least 8 characters" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, role: "admin", name: existing.name || "Admin" },
    });
    return NextResponse.json({ ok: true, action: "updated", email });
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "admin",
      name: "Admin",
    },
  });
  return NextResponse.json({ ok: true, action: "created", email });
}
