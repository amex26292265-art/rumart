"use client";

import { useState } from "react";
import Link from "next/link";
import { applyAsSeller } from "@/app/actions/seller";
import { Button } from "@/components/ui/button";

export function SellerApplyForm({ signedIn }: { signedIn: boolean }) {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!signedIn) {
    return (
      <Link href="/login?next=/sell">
        <Button size="lg">Sign in to apply</Button>
      </Link>
    );
  }

  if (ok) {
    return (
      <div className="card border-accent-500/30 p-6 text-sm text-ink-800">
        Application submitted. An admin will review it shortly — you&apos;ll get a notification when approved.
      </div>
    );
  }

  return (
    <form
      className="card space-y-3 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setMsg(null);
        const res = await applyAsSeller({ displayName, bio, experience });
        setLoading(false);
        if (!res.ok) {
          setMsg(res.error ?? "Failed");
          return;
        }
        setOk(true);
      }}
    >
      <input
        className="field"
        required
        minLength={3}
        placeholder="Seller display name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
      />
      <textarea
        className="field min-h-[80px]"
        placeholder="Short bio (optional)"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
      />
      <textarea
        className="field min-h-[80px]"
        placeholder="Selling experience (optional)"
        value={experience}
        onChange={(e) => setExperience(e.target.value)}
      />
      {msg && <p className="text-sm text-red-400">{msg}</p>}
      <Button type="submit" disabled={loading} size="lg">
        {loading ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
