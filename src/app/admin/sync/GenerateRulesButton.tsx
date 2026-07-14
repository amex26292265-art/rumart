"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateAllRules } from "@/app/actions/admin";

/** One click: create an enabled sync rule for every category (all games). */
export function GenerateRulesButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        onClick={() =>
          startTransition(async () => {
            const res = await generateAllRules();
            setMsg(`${res.created} created, ${res.updated} updated — now run sync.`);
            router.refresh();
          })
        }
        disabled={pending}
      >
        <Wand2 className="h-4 w-4" />
        {pending ? "Generating…" : "Generate rules for all games"}
      </Button>
      {msg && <span className="text-xs text-ink-500">{msg}</span>}
    </div>
  );
}
