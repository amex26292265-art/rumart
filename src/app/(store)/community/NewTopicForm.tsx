"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createForumTopic } from "@/app/actions/forum";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

const KINDS = [
  { value: "discussion", label: "Discussion" },
  { value: "guide", label: "Guide" },
  { value: "question", label: "Question" },
  { value: "service", label: "Sell a service" },
];

export function NewTopicForm({
  categories,
}: {
  categories: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "marketplace");
  const [kind, setKind] = useState("discussion");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Container className="max-w-2xl py-10">
      <Link href="/community" className="text-sm text-accent-400 hover:underline">
        ← Community
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold text-ink-950">New topic</h1>
      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError(null);
          const res = await createForumTopic({ categorySlug, title, body, kind });
          setLoading(false);
          if (!res.ok) {
            setError(res.error ?? "Failed");
            return;
          }
          router.push(`/community/${categorySlug}/${res.slug}`);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-ink-600">
            Category
            <select className="field mt-1" value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)}>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-ink-600">
            Type
            <select className="field mt-1" value={kind} onChange={(e) => setKind(e.target.value)}>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm text-ink-600">
          Title
          <input
            className="field mt-1"
            required
            minLength={5}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Clear, specific title"
          />
        </label>
        <label className="block text-sm text-ink-600">
          Body
          <textarea
            className="field mt-1 min-h-[180px]"
            required
            minLength={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share details. Mention users with @username."
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" disabled={loading} size="lg">
          {loading ? "Publishing…" : "Publish topic"}
        </Button>
      </form>
    </Container>
  );
}
