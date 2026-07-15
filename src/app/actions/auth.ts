"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signOut } from "@/auth";
import { hashPassword } from "@/lib/password";

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().max(80).optional(),
});

export async function registerAction(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "An account with this email already exists." };

  await prisma.user.create({
    data: {
      email,
      name: parsed.data.name?.trim() || null,
      passwordHash: await hashPassword(parsed.data.password),
      role: "customer",
    },
  });
  return { ok: true };
}
