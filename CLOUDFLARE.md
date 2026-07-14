# Deploying Rumart to Cloudflare

A full Next.js app (Prisma, Node crypto, NextAuth, server actions) runs on
Cloudflare via **`@opennextjs/cloudflare`** → **Cloudflare Workers**. This is
Cloudflare's supported path for Next.js; the old `next-on-pages`/Edge route
can't run Prisma or Node crypto.

Everything is already wired. Deploy through Cloudflare's **Git-connected build**
(it builds on Linux). **Do not build/deploy from Windows locally** — OpenNext's
bundler hits a Windows-only "Access is denied" error on pnpm's files. Cloudflare's
Linux builders (and macOS/WSL) are fine.

## What was fixed / added

- **The pnpm error** (`packages field missing or empty`) was caused by a committed
  `pnpm-workspace.yaml`. It's removed from the repo; pnpm settings live in `.npmrc`.
- `@opennextjs/cloudflare` + `wrangler.jsonc` + `open-next.config.ts`.
- **Prisma** uses the **Neon serverless driver adapter** on Workers (the binary
  engine can't run there) and the normal engine on Node — automatic, no changes needed.
- Removed Node middleware (OpenNext doesn't support it; `/admin` is still fully
  protected by the admin layout + every server action).

## 1. Create the project

Cloudflare dashboard → **Workers & Pages → Create → Import a repository** →
connect GitHub → select **rumart**.

## 2. Build settings

| Setting | Value |
| --- | --- |
| Install command | `pnpm install` |
| Build command | `pnpm cf:build` |
| Deploy command | `npx wrangler deploy` |

`wrangler.jsonc` already sets `main`, the `ASSETS` binding, and the
`nodejs_compat` flag with a recent compatibility date — no extra dashboard
config needed for those.

## 3. Environment variables

Add these under the project's **Settings → Variables and Secrets**. Mark the
sensitive ones as **Secret**. `NEXT_PUBLIC_*` must also be available at **build
time** (set it as a build variable too — it's inlined into the client bundle).

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Your Neon Postgres URL (the pooled `-pooler` host is correct for the app) |
| `AUTH_SECRET` | `npx auth secret` |
| `AUTH_URL` | `https://rumart.xyz` |
| `AUTH_TRUST_HOST` | `true` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin login |
| `SECRETS_ENCRYPTION_KEY` | 64 hex chars, stable |
| `LZT_API_BASE` / `LZT_API_TOKEN` | Supplier |
| `NEXT_PUBLIC_SITE_URL` | `https://rumart.xyz` (build + runtime) |
| `SITE_CURRENCY` | `USD` |
| `CRYPTOMUS_MERCHANT_ID` / `CRYPTOMUS_PAYMENT_KEY` | Crypto payments |

Node version: set `NODE_VERSION = 20` (or newer) in the build variables.

## 4. Deploy, domain, Cryptomus

1. **Deploy** — Cloudflare builds on Linux and publishes the Worker.
2. **Domain** — Workers project → **Settings → Domains & Routes → Add custom
   domain** → `rumart.xyz`, then set the DNS record it shows.
3. **Cryptomus "Confirm domain"** — works only after step 2 (the domain must be
   live and yours). Then set the Cryptomus webhook to
   `https://rumart.xyz/api/webhooks/cryptomus`.

## Notes / fallback

- The database (Neon) is already set up with schema, admin, and products, shared
  with any other environment.
- **Prisma on Workers**: wired via the Neon adapter. If you ever see a Prisma
  runtime error on the Worker, the bulletproof alternative is **Prisma Accelerate**
  (set `DATABASE_URL` to the Accelerate URL and use `@prisma/extension-accelerate`).
- Local `pnpm dev` / `pnpm build` still work normally for development.
