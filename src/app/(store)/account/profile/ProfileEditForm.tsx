"use client";

import { useState } from "react";
import { updateProfile } from "@/app/actions/social";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

type Profile = {
  username: string | null;
  name: string | null;
  bio: string | null;
  discord: string | null;
  telegram: string | null;
  website: string | null;
  country: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
};

export function ProfileEditForm({ initial }: { initial: Profile }) {
  const [form, setForm] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof Profile, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Container className="max-w-xl py-10">
      <h1 className="font-display text-3xl font-bold text-ink-950">Edit profile</h1>
      <form
        className="mt-8 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setMsg(null);
          const res = await updateProfile({
            username: form.username || undefined,
            name: form.name || undefined,
            bio: form.bio || undefined,
            discord: form.discord || undefined,
            telegram: form.telegram || undefined,
            website: form.website || undefined,
            country: form.country || undefined,
            avatarUrl: form.avatarUrl || undefined,
            bannerUrl: form.bannerUrl || undefined,
          });
          setLoading(false);
          setMsg(res.ok ? "Saved." : res.error ?? "Failed");
        }}
      >
        {(
          [
            ["username", "Username"],
            ["name", "Display name"],
            ["country", "Country"],
            ["discord", "Discord"],
            ["telegram", "Telegram"],
            ["website", "Website"],
            ["avatarUrl", "Avatar URL"],
            ["bannerUrl", "Banner URL"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-sm text-ink-600">
            {label}
            <input
              className="field mt-1"
              value={form[key] ?? ""}
              onChange={(e) => set(key, e.target.value)}
            />
          </label>
        ))}
        <label className="block text-sm text-ink-600">
          Bio
          <textarea
            className="field mt-1 min-h-[100px]"
            value={form.bio ?? ""}
            onChange={(e) => set("bio", e.target.value)}
          />
        </label>
        {msg && <p className="text-sm text-ink-600">{msg}</p>}
        <Button type="submit" disabled={loading} size="lg">
          {loading ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </Container>
  );
}
