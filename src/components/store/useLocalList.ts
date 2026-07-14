"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A tiny localStorage-backed id set, synced across components/tabs.
 * Used for wishlist and compare lists.
 */
export function useLocalList(key: string) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const read = () => {
      try {
        setIds(JSON.parse(localStorage.getItem(key) ?? "[]"));
      } catch {
        setIds([]);
      }
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener(`local:${key}`, read as EventListener);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener(`local:${key}`, read as EventListener);
    };
  }, [key]);

  const toggle = useCallback(
    (id: string) => {
      try {
        const cur: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");
        const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
        localStorage.setItem(key, JSON.stringify(next));
        setIds(next);
        window.dispatchEvent(new Event(`local:${key}`));
      } catch {}
    },
    [key],
  );

  return { ids, has: (id: string) => ids.includes(id), toggle };
}
