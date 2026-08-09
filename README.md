# Rumart — premium automated digital marketplace

Rumart is a single-seller reseller marketplace. Customers only ever interact with Rumart —
the upstream supplier (LZT Market) is never exposed. Inventory imports automatically, prices
apply automatically, and delivery is fully automated: buy → purchase upstream → encrypt →
deliver credentials, with no manual step.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Framer Motion ·
Prisma · SQLite (local) / Postgres (prod) · Auth.js v5 · Zod · pnpm.

---

## Related: Memecoin Intelligence

An independent local Solana memecoin decision-support app (paper trading only) lives in
[`memecoin-intelligence/`](./memecoin-intelligence/). See its README and `docs/` for Phase 1.

---

## Quick start

```bash
pnpm install
cp .env.example .env          # set AUTH_SECRET, SECRETS_ENCRYPTION_KEY, ADMIN_PASSWORD
pnpm db:push                  # create the SQLite schema
pnpm db:seed                  # admin, supplier, categories, default pricing (NO fake products)
pnpm dev                      # http://localhost:3000
```

Generate the two required secrets:

```bash
npx auth secret                                             # AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # SECRETS_ENCRYPTION_KEY
```

### Admin

- URL: `/admin` (protected by `src/proxy.ts` + re-checked in every page/action)
- Default login (from `.env`): `admin@rumart.xyz` / `rumart-admin-2026` — change before deploying.

---

## How it works

- **Supplier abstraction** (`src/lib/suppliers/`) — never hardcodes one supplier. `LztMarketService`
  (`lzt/service.ts`) is the single gateway for every LZT API call; `lzt/adapter.ts` maps LZT items to
  the internal `Supplier` interface. Add future suppliers in `registry.ts` — nothing else changes.
- **Synchronization** (`src/lib/sync/`) — admin-configurable rules (category, price range, seller
  rating, country, auto-delivery only, keyword/white/black lists, import cap) import real listings,
  update prices/stock, and drop unavailable ones. Runs inline today; the `runRule`/`runAll` shape is
  BullMQ-ready (one job per rule) and there is a cron endpoint at `/api/cron/sync`.
- **Pricing engine** (`src/lib/pricing/`) — flat or percentage markup, min/max margin, rounding
  (.99 / whole). Category rules override the global rule. Applied at import time.
- **Automated purchase** (`src/lib/orders/purchase.ts`) — validates, re-checks upstream availability,
  buys with a price guard, encrypts credentials (AES-256-GCM), records the order, and marks the
  listing sold. No manual intervention.
- **Delivery** — the order page decrypts and shows credentials with reveal / copy / download.

## Important: the supplied `market.json`

The provided `marketapi.json` is the Lolzteam **Forum** API and contains no Market endpoints, so the
Market client is modeled on the official Market API (`prod-api.lolz.live/market`,
docs at lzt-market.readme.io). **`src/lib/suppliers/lzt/service.ts` is the only file to adjust** if
your account's Market contract differs — nothing else calls the API directly.

## Go live with real inventory

1. Put an LZT token with `market` scope in `LZT_API_TOKEN`.
2. In **Admin → Synchronization**, review the sample rules and enable the ones you want.
3. Click **Run sync now** (or hit `/api/cron/sync`). Real listings import, get priced, and become
   buyable with automated delivery. Until then the catalog is intentionally empty — Rumart never
   shows fake products, reviews, or stats.

## No fakery

Empty states everywhere real data isn't available yet. Products, reviews, and homepage stats are all
read from the database. The seed creates only structure (admin, categories, pricing, sample rules).

## Deploy to Vercel (rumart.xyz)

1. Switch `provider` in `prisma/schema.prisma` to `postgresql` and set `DATABASE_URL` to your Postgres
   (Neon/Supabase). Run `pnpm prisma db push && pnpm db:seed`.
2. Set env vars in Vercel: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`,
   `SECRETS_ENCRYPTION_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `LZT_API_TOKEN`, `NEXT_PUBLIC_SITE_URL`,
   optionally `CRON_SECRET`.
3. `vercel.json` already schedules the hourly sync cron. Point the `rumart.xyz` domain at the project.
4. Uploaded assets aren't used yet; when added, use external storage (Vercel Blob/S3) — Vercel's FS is
   ephemeral.

## Roadmap (next milestones)

- Payments: **Stripe** + **crypto**, both settling automatically into the existing order pipeline.
- **BullMQ + Redis** workers for scheduled/queued sync and retries (structure already in place).
- Customer area: wishlist, compare, reviews from verified purchases, wallet/store credit, coupons.
- 2FA (fields already in the schema), multi-currency, affiliate system.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm build` | `prisma generate` + production build |
| `pnpm db:push` / `pnpm db:seed` | Create schema / seed structure |
| `pnpm db:studio` | Prisma Studio |
| `pnpm lint` | ESLint |
