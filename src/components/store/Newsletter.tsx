"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Newsletter capture. Stores nothing yet — wired to an endpoint in a later milestone. */
export function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <div className="card relative overflow-hidden bg-ink-950 px-6 py-12 text-center sm:px-12">
      <div className="pointer-events-none absolute inset-0 opacity-20 dot-grid" />
      <div className="relative mx-auto max-w-xl">
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          New drops, in your inbox
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-300">
          Get notified when fresh listings and flash deals go live. No spam, ever.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (email.includes("@")) setDone(true);
          }}
          className="mx-auto mt-6 flex max-w-md items-center gap-2"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="field !h-11 flex-1 !rounded-full !border-ink-700 !bg-ink-900 !text-white placeholder:!text-ink-500"
          />
          <Button type="submit" variant="accent" className="!h-11 !rounded-full">
            {done ? "Subscribed ✓" : "Subscribe"}
          </Button>
        </form>
      </div>
    </div>
  );
}
