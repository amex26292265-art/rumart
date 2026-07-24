import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true } } },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink-950">Audit logs</h1>
      <p className="mt-1 text-sm text-ink-500">Security and admin action trail.</p>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-mist-300 text-xs uppercase text-ink-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Meta</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-500">
                  No audit events yet.
                </td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-mist-300/60">
                <td className="whitespace-nowrap px-4 py-3 text-ink-500">{l.createdAt.toLocaleString()}</td>
                <td className="px-4 py-3 text-ink-800">{l.user?.email ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-ink-950">{l.action}</td>
                <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-ink-500">
                  {l.meta ? JSON.stringify(l.meta) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
