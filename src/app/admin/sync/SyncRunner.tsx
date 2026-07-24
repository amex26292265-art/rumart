"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { purgeNoCaptureProducts, triggerSync } from "@/app/actions/admin";

export function SyncRunner({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const run = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await triggerSync();
      if ("error" in res) setMessage(res.error);
      else
        setMessage(
          `Imported ${res.imported}, updated ${res.updated}${res.removed != null ? `, removed ${res.removed}` : ""}.`,
        );
      router.refresh();
    });
  };

  const purge = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await purgeNoCaptureProducts();
      if ("error" in res) setMessage(res.error);
      else setMessage(`Purged ${res.deleted} junk / no-capture listings.`);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={purge} disabled={pending} variant="outline">
          Purge no-capture
        </Button>
        <Button onClick={run} disabled={pending || !configured} variant="primary">
          <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
          {pending ? "Working…" : "Run sync now"}
        </Button>
      </div>
      {!configured && (
        <span className="text-xs text-amber-600">Set LZT_API_TOKEN to enable syncing.</span>
      )}
      {message && <span className="text-xs text-ink-500">{message}</span>}
    </div>
  );
}
