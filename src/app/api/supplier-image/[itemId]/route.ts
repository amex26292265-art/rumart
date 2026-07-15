import { env } from "@/lib/env";

/**
 * Proxy for LZT preview collages (fortnite skins, pickaxes, steam games…).
 * The upstream endpoint requires our Bearer token and answers with a large
 * { base64 } JSON, so the browser can't load it directly. Responses are
 * cached at the Cloudflare edge for a month — each image is only pulled from
 * LZT once, keeping us far away from the API rate limit.
 */
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ itemId: string }> },
): Promise<Response> {
  const { itemId } = await ctx.params;
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "";
  if (!/^\d+$/.test(itemId) || !/^[a-z_]{2,20}$/.test(type)) {
    return new Response("Not found", { status: 404 });
  }

  // Workers edge cache (absent on local Node dev — then we just fetch).
  const caches = (globalThis as { caches?: { default?: Cache } }).caches;
  const cache = caches?.default;
  const cacheKey = new Request(url.toString());
  const hit = await cache?.match(cacheKey);
  if (hit) return hit;

  const upstream = await fetch(
    `${env.LZT_API_BASE}/market/${itemId}/image?type=${encodeURIComponent(type)}`,
    {
      headers: { Authorization: `Bearer ${env.LZT_API_TOKEN}`, Accept: "application/json" },
      cache: "no-store",
    },
  );
  if (!upstream.ok) return new Response("Not found", { status: 404 });

  const data = (await upstream.json().catch(() => null)) as { base64?: string } | null;
  if (!data?.base64) return new Response("Not found", { status: 404 });

  const bytes = Buffer.from(data.base64, "base64");
  const res = new Response(bytes, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=2592000, immutable",
    },
  });
  await cache?.put(cacheKey, res.clone());
  return res;
}
