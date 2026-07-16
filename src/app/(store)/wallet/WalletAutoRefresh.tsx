"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * After returning from the hosted checkout (?paid=1) the wallet credit arrives
 * via the IPN webhook a few seconds later. Refresh the server component a few
 * times so the new balance and deposit status appear without a manual reload.
 */
export function WalletAutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      router.refresh();
      if (n >= 15) clearInterval(id); // ~1 minute of polling
    }, 4000);
    return () => clearInterval(id);
  }, [active, router]);
  return null;
}
