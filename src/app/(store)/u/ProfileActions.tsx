"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { followUser, startConversation } from "@/app/actions/social";
import { Button } from "@/components/ui/button";

export function FollowButton({ userId, initial }: { userId: string; initial: boolean }) {
  const [following, setFollowing] = useState(initial);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant={following ? "outline" : "default"}
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const res = await followUser(userId);
        setLoading(false);
        if (res.ok) {
          setFollowing(Boolean(res.following));
          router.refresh();
        }
      }}
    >
      {following ? "Following" : "Follow"}
    </Button>
  );
}

export function MessageButton({ recipientId }: { recipientId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const res = await startConversation({
          recipientId,
          body: "Hi! I'd like to chat on Rumart.",
          subject: "Marketplace chat",
        });
        setLoading(false);
        if (res.ok && res.conversationId) {
          router.push(`/messages/${res.conversationId}`);
        }
      }}
    >
      Message
    </Button>
  );
}
