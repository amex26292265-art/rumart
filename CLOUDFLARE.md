# Deploying Rumart to Cloudflare Workers

Rumart runs on **Cloudflare Workers** via `@opennextjs/cloudflare` (OpenNext).
Account: **amex**. Worker: **rumart**.

Production URL (until custom domain):  
`https://rumart.amex26292265.workers.dev`

## Build & deploy (Linux / WSL)

Do **not** build on Windows — OpenNext + Prisma WASM paths break.

```bash
pnpm install
pnpm cf:build
npx wrangler@4.110.0 deploy
```

Or: `pnpm cf:deploy`

## Environment

**Plain vars** are in [`wrangler.jsonc`](wrangler.jsonc) (`NEXT_PUBLIC_SITE_URL`, `AUTH_URL`, etc.).

**Secrets** (set with `wrangler secret bulk <utf8-json>` — avoid trailing newlines):

- `DATABASE_URL` — Neon `postgresql://…`
- `AUTH_SECRET`
- `SECRETS_ENCRYPTION_KEY` — 64 hex chars
- `LZT_API_TOKEN`
- `NOWPAYMENTS_API_KEY` / `NOWPAYMENTS_IPN_SECRET` / `NOWPAYMENTS_PUBLIC_KEY`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- `CRON_SECRET` — protects `/api/cron/sync`

## Cron (every 30 minutes)

`wrangler.jsonc` declares `*/30 * * * *`. Also ping HTTP if your OpenNext build
does not wire `scheduled` → route:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://rumart.amex26292265.workers.dev/api/cron/sync
```

## NOWPayments IPN

Set callback to:

`https://rumart.amex26292265.workers.dev/api/webhooks/nowpayments`

## Verify

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://rumart.amex26292265.workers.dev/
curl -s -o /dev/null -w '%{http_code}\n' https://rumart.amex26292265.workers.dev/marketplace
curl -s -o /dev/null -w '%{http_code}\n' https://rumart.amex26292265.workers.dev/login
```

Expect `200` for those paths. `/wallet` and `/admin` redirect (`307`) when logged out.

## Prisma on Workers

[`src/lib/prisma.ts`](src/lib/prisma.ts) must keep `neonConfig.poolQueryViaFetch = true`.
Do not reintroduce Prisma Accelerate.
