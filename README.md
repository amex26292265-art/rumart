# Rumart — premium automated digital marketplace by Velexis

Rumart is a reseller marketplace for game accounts, AI subscriptions, and digital
goods. Customers interact only with Rumart — upstream suppliers are never exposed.
Inventory syncs automatically, wallet checkout uses crypto (NOWPayments), and
delivery encrypts credentials with AES-256-GCM.

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind v4 · Framer Motion ·
Prisma + Neon · Auth.js v5 · OpenNext → Cloudflare Workers · pnpm.

**Live:** `https://rumart.amex26292265.workers.dev` (custom domain later)

---

## Quick start

```bash
pnpm install
cp .env.example .env          # set AUTH_SECRET, SECRETS_ENCRYPTION_KEY, DATABASE_URL, ADMIN_*
pnpm db:push                  # apply schema to Neon
pnpm db:seed                  # admin, suppliers, categories, pricing
pnpm dev                      # http://localhost:3000
```

## Cloudflare deploy

See [CLOUDFLARE.md](CLOUDFLARE.md). Build on Linux:

```bash
pnpm cf:build
npx wrangler deploy
```

## Architecture

- **LZT supplier** — `src/lib/suppliers/lzt/` (only place that talks to Market API)
- **Purchase** — `src/lib/orders/purchase.ts` (wallet → LZT / manual / seller stock)
- **Wallet** — NOWPayments IPN → credit; buy debits atomically
- **Sellers** — apply → admin approve → seller dashboard + public profile
- **Admin** — sync, pricing, products, orders, sellers, reviews, promos, logs

## Hard rule

Customers must never see LZT/Lolzteam, raw API JSON, or supplier URLs.
