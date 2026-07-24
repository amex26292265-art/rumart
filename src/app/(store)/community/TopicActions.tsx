"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { replyToTopic, reactToPost } from "@/app/actions/forum";
import { Button } from "@/components/ui/button";

export function TopicReplyForm({ topicSlug, signedIn }: { topicSlug: string; signedIn: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!signedIn) {
    return (
      <p className="text-sm text-ink-500">
        <a href={`/login?next=/community`} className="text-accent-400 hover:underline">
          Sign in
        </a>{" "}
        to reply.
      </p>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const res = await replyToTopic({ topicSlug, body, imageUrl: imageUrl || undefined });
        setLoading(false);
        if (!res.ok) {
          setError(res.error ?? "Failed");
          return;
        }
        setBody("");
        setImageUrl("");
        router.refresh();
      }}
    >
      <textarea
        className="field min-h-[100px]"
        required
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply… Use @username to mention."
      />
      <input
        className="field"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="Image URL (optional)"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Posting…" : "Reply"}
      </Button>
    </form>
  );
}

export function ReactionBar({ postId }: { postId: string }) {
  const router = useRouter();
  const emojis = [
    { key: "like", label: "👍" },
    { key: "fire", label: "🔥" },
    { key: "helpful", label: "💡" },
    { key: "wow", label: "😮" },
  ];
  return (
    <div className="mt-2 flex gap-1">
      {emojis.map((e) => (
        <button
          key={e.key}
          type="button"
          className="rounded-lg border border-mist-300 px-2 py-0.5 text-xs hover:border-accent-500/50"
          onClick={async () => {
            await reactToPost({ postId, emoji: e.key });
            router.refresh();
          }}
        >
          {e.label}
        </button>
      ))}
    </div>
  );
}
