import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword, needsRehash, hashPassword } from "@/lib/password";

/**
 * Auth.js v5, JWT sessions, credentials provider. Roles are carried in the JWT
 * so route protection needs no DB round-trip. Admin routes are guarded in
 * proxy.ts (middleware) and re-checked in server actions.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        if (!(await verifyPassword(password, user.passwordHash))) return null;
        // Transparently upgrade legacy bcrypt hashes to the fast scheme.
        if (needsRehash(user.passwordHash)) {
          await prisma.user
            .update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } })
            .catch(() => undefined);
        }
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role ?? "customer";
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = (token.role as string) ?? "customer";
        (session.user as { id?: string }).id = token.sub ?? "";
      }
      return session;
    },
  },
});
