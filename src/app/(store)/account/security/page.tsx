import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/ui/container";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Security" };

export default async function SecurityPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login?next=/account/security");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");

  return (
    <Container className="py-12">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-950">Security</h1>
          <p className="mt-1 text-sm text-ink-500">Account protection controls</p>
        </div>
        <Link href="/account" className="text-sm font-semibold text-accent-400">
          ← Account
        </Link>
      </div>

      <div className="card space-y-6 p-6">
        <div>
          <h2 className="font-semibold text-ink-950">Email</h2>
          <p className="mt-1 text-sm text-ink-500">{user.email}</p>
        </div>
        <div>
          <h2 className="font-semibold text-ink-950">Password</h2>
          <p className="mt-1 text-sm text-ink-500">
            Stored with PBKDF2 (WebCrypto). Contact support via Telegram to reset if locked out.
          </p>
        </div>
        <div>
          <h2 className="font-semibold text-ink-950">Two-factor authentication</h2>
          <p className="mt-1 text-sm text-ink-500">
            {user.twoFactorEnabled ? "Enabled" : "Coming soon — fields are reserved in the schema."}
          </p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline">
            Sign out of this session
          </Button>
        </form>
      </div>
    </Container>
  );
}
