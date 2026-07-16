"use client";

import { useState } from "react";
import { Eye, EyeOff, Copy, Check, Download } from "lucide-react";

interface Field {
  label: string;
  value: string;
  secret?: boolean;
}

/**
 * Parse the decrypted credential payload. New orders store a JSON array of
 * sanitized fields; legacy orders stored plain "Label: value" text. Either way
 * we only ever render clean labelled fields — never raw JSON or supplier data.
 */
function parseFields(raw: string): Field[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((f) => f && typeof f.label === "string" && typeof f.value === "string")
        .map((f) => ({ label: f.label, value: f.value, secret: f.secret !== false }));
    }
  } catch {
    /* not JSON — fall through to line parsing */
  }
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(":");
      if (idx > 0 && idx < 24) {
        return { label: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim(), secret: true };
      }
      return { label: "Data", value: line, secret: true };
    });
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-mist-300 px-2.5 py-1 text-xs font-medium text-ink-600 transition-colors hover:border-ink-400 hover:text-ink-900"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function CredentialViewer({
  productTitle,
  credentials,
}: {
  productTitle: string;
  credentials: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const fields = parseFields(credentials);

  const asText = fields.map((f) => `${f.label}: ${f.value}`).join("\n");
  const download = () => {
    const blob = new Blob([asText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${productTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "account"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-mist-200 px-5 py-3">
        <span className="text-sm font-semibold text-ink-950">Your product</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setRevealed((r) => !r)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-ink-600 hover:bg-mist-100"
          >
            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {revealed ? "Hide" : "Reveal"}
          </button>
          <button
            onClick={download}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-ink-600 hover:bg-mist-100"
          >
            <Download className="h-3.5 w-3.5" /> TXT
          </button>
        </div>
      </div>
      <div className="divide-y divide-mist-100">
        {fields.map((f, i) => {
          const hidden = f.secret && !revealed;
          return (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <span className="w-32 shrink-0 text-xs font-medium uppercase tracking-wide text-ink-400">
                {f.label}
              </span>
              <span
                className={`min-w-0 flex-1 truncate font-mono text-sm ${
                  hidden ? "select-none text-ink-300" : "text-ink-900"
                }`}
                title={hidden ? undefined : f.value}
              >
                {hidden ? "•".repeat(Math.min(24, Math.max(8, f.value.length))) : f.value}
              </span>
              <CopyButton value={f.value} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
