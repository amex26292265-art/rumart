"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { applyAsSeller } from "@/app/actions/seller";
import { Button } from "@/components/ui/button";

const STEPS = ["Identity", "Experience", "Presence", "Review"] as const;

const CATEGORY_OPTIONS = [
  "Steam",
  "Valorant",
  "Fortnite",
  "Roblox",
  "Discord",
  "AI subscriptions",
  "Software",
  "Hosting",
  "Social media",
  "Streaming",
  "Digital services",
];

export function SellerApplyForm({ signedIn }: { signedIn: boolean }) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [country, setCountry] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [discord, setDiscord] = useState("");
  const [telegram, setTelegram] = useState("");
  const [website, setWebsite] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const canNext = useMemo(() => {
    if (step === 0) return displayName.trim().length >= 3;
    if (step === 1) return experience.trim().length >= 10 && categories.length > 0;
    if (step === 2) return Boolean(discord.trim() || telegram.trim() || website.trim());
    return reason.trim().length >= 20;
  }, [step, displayName, experience, categories, discord, telegram, website, reason]);

  if (!signedIn) {
    return (
      <Link href="/login?next=/sell">
        <Button size="lg">Sign in to apply</Button>
      </Link>
    );
  }

  if (ok) {
    return (
      <div className="rounded-2xl border border-accent-500/30 bg-accent-600/10 p-6 text-sm text-ink-800">
        Application submitted. An admin will review it — you&apos;ll get a notification when approved.
      </div>
    );
  }

  const toggleCat = (c: string) => {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  return (
    <div className="rounded-2xl border border-mist-300/70 bg-mist-100/80 p-6">
      <div className="mb-6 flex gap-2">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex-1 rounded-full px-2 py-1.5 text-center text-[0.65rem] font-semibold uppercase tracking-wider ${
              i === step
                ? "bg-accent-600/30 text-accent-400"
                : i < step
                  ? "bg-mist-200 text-ink-700"
                  : "bg-mist-50 text-ink-400"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (step < STEPS.length - 1) {
            if (canNext) setStep((s) => s + 1);
            return;
          }
          setLoading(true);
          setMsg(null);
          const res = await applyAsSeller({
            displayName,
            bio,
            experience,
            categories: categories.join(", "),
            country,
            portfolio,
            discord,
            telegram,
            website,
            reason,
          });
          setLoading(false);
          if (!res.ok) {
            setMsg(res.error ?? "Failed");
            return;
          }
          setOk(true);
        }}
      >
        {step === 0 && (
          <>
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
              placeholder="Short bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <input
              className="field"
              placeholder="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </>
        )}

        {step === 1 && (
          <>
            <textarea
              className="field min-h-[100px]"
              required
              placeholder="Selling experience — platforms, volume, niches"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
            />
            <div>
              <p className="mb-2 text-sm text-ink-600">Categories you sell</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCat(c)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      categories.includes(c)
                        ? "border-accent-500/50 bg-accent-600/20 text-accent-400"
                        : "border-mist-300 text-ink-600"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              className="field min-h-[70px]"
              placeholder="Portfolio links (optional)"
              value={portfolio}
              onChange={(e) => setPortfolio(e.target.value)}
            />
          </>
        )}

        {step === 2 && (
          <>
            <input
              className="field"
              placeholder="Discord"
              value={discord}
              onChange={(e) => setDiscord(e.target.value)}
            />
            <input
              className="field"
              placeholder="Telegram"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
            />
            <input
              className="field"
              placeholder="Website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </>
        )}

        {step === 3 && (
          <>
            <textarea
              className="field min-h-[120px]"
              required
              placeholder="Why do you want to join Rumart?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="rounded-xl border border-mist-300 bg-mist-50 p-4 text-sm text-ink-600">
              <p>
                <strong className="text-ink-900">{displayName}</strong> · {country || "Worldwide"}
              </p>
              <p className="mt-1">{categories.join(" · ") || "No categories"}</p>
              <p className="mt-2 line-clamp-3">{experience}</p>
            </div>
          </>
        )}

        {msg && <p className="text-sm text-red-400">{msg}</p>}

        <div className="flex gap-2 pt-2">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          <Button type="submit" disabled={loading || !canNext} size="lg" className="flex-1">
            {step < STEPS.length - 1 ? "Continue" : loading ? "Submitting…" : "Submit application"}
          </Button>
        </div>
      </form>
    </div>
  );
}
