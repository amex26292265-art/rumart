/**
 * Simple Workers-safe rate limiter.
 * Uses an in-memory Map (per isolate). Good enough to blunt abuse without Redis.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || cur.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (cur.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((cur.resetAt - now) / 1000) };
  }
  cur.count += 1;
  return { ok: true };
}

/** Periodically prune expired buckets to avoid unbounded growth. */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }, 60_000).unref?.();
}
