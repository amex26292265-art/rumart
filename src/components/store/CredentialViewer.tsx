"use client";

import { useState } from "react";
import { Eye, EyeOff, Copy, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Reveal / copy / download delivered credentials. Hidden by default. */
export function CredentialViewer({
  productTitle,
  credentials,
}: {
  productTitle: string;
  credentials: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(credentials);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const download = () => {
    const blob = new Blob([credentials], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${productTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lines = credentials.split("\n");

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-mist-200 px-5 py-3">
        <span className="text-sm font-medium text-ink-950">{productTitle}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setRevealed((r) => !r)}>
            {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {revealed ? "Hide" : "Reveal"}
          </Button>
          <Button variant="ghost" size="sm" onClick={copy}>
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="ghost" size="sm" onClick={download}>
            <Download className="h-4 w-4" /> TXT
          </Button>
        </div>
      </div>
      <div className="space-y-1.5 p-5 font-mono text-sm">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`rounded-lg bg-mist-50 px-3 py-2 ${revealed ? "text-ink-900" : "select-none blur-sm"}`}
          >
            {revealed ? line : "•".repeat(Math.min(28, Math.max(8, line.length)))}
          </div>
        ))}
      </div>
    </div>
  );
}
