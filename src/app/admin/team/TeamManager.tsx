"use client";

import { useState, useTransition } from "react";
import { createAdminUser, setUserRole } from "@/app/actions/admin";

type AdminRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
};

export function TeamManager({ admins, selfId }: { admins: AdminRow[]; selfId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <form
        className="card space-y-3 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setMsg(null);
          setErr(null);
          start(async () => {
            const res = await createAdminUser(fd);
            if ("error" in res && res.ok === false) setErr(res.error);
            else {
              setMsg("Admin saved.");
              e.currentTarget.reset();
            }
          });
        }}
      >
        <h2 className="font-display text-lg font-bold text-ink-950">Add admin</h2>
        <p className="text-sm text-ink-500">Promote an existing user or create a new admin account.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <input name="email" type="email" required placeholder="admin@rumart.wtf" className="field" />
          <input name="name" placeholder="Display name" className="field" />
          <input name="password" type="password" required minLength={10} placeholder="Password (10+)" className="field" />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save admin"}
        </button>
        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
        {err && <p className="text-sm text-red-400">{err}</p>}
      </form>

      <div className="card overflow-hidden">
        <div className="border-b border-mist-300 px-5 py-3">
          <h2 className="font-semibold text-ink-950">Admin team</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-mist-50 text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} className="border-t border-mist-300">
                <td className="px-5 py-3 font-medium text-ink-950">{a.email}</td>
                <td className="px-5 py-3 text-ink-500">{a.name ?? "—"}</td>
                <td className="px-5 py-3">
                  <span className="rounded-md bg-accent-500/15 px-2 py-0.5 text-xs font-semibold text-accent-400">
                    {a.role}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {a.id !== selfId && (
                    <button
                      type="button"
                      className="text-xs font-medium text-red-400 hover:underline"
                      onClick={() => {
                        const fd = new FormData();
                        fd.set("id", a.id);
                        fd.set("role", "customer");
                        start(async () => {
                          await setUserRole(fd);
                        });
                      }}
                    >
                      Demote
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
