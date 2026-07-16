/**
 * Tiny in-process TTL memo cache. Cloudflare Workers reuse a warm isolate
 * across many requests, so caching hot, user-independent reads (site settings,
 * category list, homepage rows) here means most page views skip the database
 * entirely — the key to staying under free-tier DB limits.
 *
 * Never cache per-user data (auth, wallet, orders) with this.
 */
type Entry = { value: unknown; expires: number };
const store = new Map<string, Entry>();

export async function memo<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  const now = Date.now();
  if (hit && hit.expires > now) return hit.value as T;
  const value = await fn();
  store.set(key, { value, expires: now + ttlMs });
  return value;
}

/** Drop cached entries (all, or those whose key starts with `prefix`). */
export function invalidate(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key);
}
