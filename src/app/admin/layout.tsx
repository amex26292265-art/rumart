import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, ExternalLink } from "lucide-react";
import { auth } from "@/auth";
import { Logo } from "@/components/brand/Logo";
import { logoutAction } from "@/app/actions/auth";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";

/** Dense control-panel chrome inspired by pro marketplaces. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== "admin") redirect("/login?next=/admin");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] bg-[#0a0a0f]">
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-white/5 bg-[#0e0e16] p-3 md:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-2 px-2 pt-2">
          <Logo />
          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
            Market
          </span>
        </Link>
        <div className="mb-4 rounded-lg border border-white/5 bg-black/30 px-3 py-2 text-xs text-ink-500">
          <p className="font-medium text-ink-800">{session?.user?.email}</p>
          <p className="mt-0.5">Operator panel</p>
        </div>
        <AdminNav />
        <div className="mt-auto space-y-1 border-t border-white/5 pt-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-500 hover:bg-white/5 hover:text-ink-950"
          >
            <ExternalLink className="h-4 w-4" /> View store
          </Link>
          <form action={logoutAction}>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-400 hover:bg-red-500/10">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-white/5 bg-[#0e0e16] px-4 py-3 md:hidden">
          <Logo />
          <div className="flex gap-3 text-sm">
            <Link href="/admin" className="text-ink-700">
              Dash
            </Link>
            <Link href="/admin/sync" className="text-ink-700">
              Sync
            </Link>
            <Link href="/admin/team" className="text-ink-700">
              Team
            </Link>
          </div>
        </div>
        <div className="p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
