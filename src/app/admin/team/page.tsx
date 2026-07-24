import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TeamManager } from "./TeamManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin team" };

export default async function AdminTeamPage() {
  const session = await auth();
  const selfId = (session?.user as { id?: string } | undefined)?.id ?? "";
  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink-950">Admin team</h1>
      <p className="mt-1 text-sm text-ink-500">Invite operators and manage admin access.</p>
      <div className="mt-8">
        <TeamManager
          selfId={selfId}
          admins={admins.map((a) => ({
            ...a,
            createdAt: a.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
