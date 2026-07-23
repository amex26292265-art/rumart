import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, ExternalLink } from "lucide-react";
import { auth } from "@/auth";
import { Logo } from "@/components/brand/Logo";
import { logoutAction } from "@/app/actions/auth";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== "admin") redirect("/login?next=/admin");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1440px] bg-paper">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-mist-300 bg-mist-50 p-4 md:flex">
        <Link href="/admin" className="mb-8 flex items-center gap-2 px-2 pt-2">
          <Logo />
          <span className="rounded-md bg-accent-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-400">
            Admin
          </span>
        </Link>
        <AdminNav />
        <div className="mt-auto space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-500 hover:bg-mist-200 hover:text-ink-950"
          >
            <ExternalLink className="h-4 w-4" /> View store
          </Link>
          <form action={logoutAction}>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-400 hover:bg-red-500/10">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-mist-300 bg-mist-50 px-4 py-3 md:hidden">
          <Logo />
          <div className="flex gap-3 text-sm">
            <Link href="/admin" className="text-ink-700">
              Dashboard
            </Link>
            <Link href="/admin/sync" className="text-ink-700">
              Sync
            </Link>
            <Link href="/admin/products" className="text-ink-700">
              Products
            </Link>
          </div>
        </div>
        <div className="p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}
