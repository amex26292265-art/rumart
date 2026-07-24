"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendMessage, setTyping } from "@/app/actions/social";
import { Button } from "@/components/ui/button";

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const res = await sendMessage({
          conversationId,
          body,
          attachmentUrl: attachmentUrl || undefined,
        });
        setLoading(false);
        if (!res.ok) {
          setError(res.error ?? "Failed");
          return;
        }
        setBody("");
        setAttachmentUrl("");
        router.refresh();
      }}
    >
      <textarea
        className="field min-h-[80px]"
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          void setTyping(conversationId);
        }}
        placeholder="Write a message…"
        required
      />
      <input
        className="field"
        value={attachmentUrl}
        onChange={(e) => setAttachmentUrl(e.target.value)}
        placeholder="Attachment URL (optional)"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}
