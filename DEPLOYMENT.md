# Deploying Rumart to Vercel (rumart.xyz)

Rumart now uses **PostgreSQL** (SQLite can't run on Vercel's serverless filesystem).
Use **one** Postgres database for both local dev and production.

---

## 1. Create a Postgres database (2 min, free)

Pick one — any works:

- **Neon** (recommended): https://neon.tech → New Project → copy the connection string
  (looks like `postgresql://user:pass@ep-xxx.neon.tech/rumart?sslmode=require`).
- **Vercel Postgres**: Vercel dashboard → Storage → Create → Postgres.
- **Supabase**: https://supabase.com → Project → Settings → Database → Connection string.

## 2. Point the app at it (local)

Put the connection string in `.env`:

```
DATABASE_URL="postgresql://user:pass@host/rumart?sslmode=require"
```

Then create the schema, seed structure, and import real products:

```bash
pnpm install
pnpm db:push          # create all tables on Postgres
pnpm db:seed          # admin user, categories, pricing, sync rules
pnpm dev              # http://localhost:3000
```

Log in at `/admin` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), open **Sync**, and
**Run sync now** to import listings from the LZT API.

## 3. Required environment variables

Set these in `.env` locally **and** in Vercel → Project → Settings → Environment Variables:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | The Postgres URL from step 1 |
| `AUTH_SECRET` | `npx auth secret` |
| `AUTH_TRUST_HOST` | `true` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Your admin login (seed creates it) |
| `SECRETS_ENCRYPTION_KEY` | 64 hex chars — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Keep it **stable** (it decrypts delivered credentials). |
| `LZT_API_BASE` | `https://prod-api.lolz.live` |
| `LZT_API_TOKEN` | LZT token with `market` scope |
| `NEXT_PUBLIC_SITE_URL` | `https://rumart.xyz` |
| `SITE_CURRENCY` | `USD` |
| `NOWPAYMENTS_API_KEY` | nowpayments.io → Settings → API keys |
| `NOWPAYMENTS_IPN_SECRET` | nowpayments.io → Settings → IPN → IPN Secret key |
| `NOWPAYMENTS_PUBLIC_KEY` | nowpayments.io → Store settings (public key) |
| `CRON_SECRET` | Optional — protects `/api/cron/sync` (Vercel Cron sends it automatically) |

## 4. Deploy to Vercel

1. Push this repo to GitHub.
2. Vercel → **Add New → Project** → import the repo.
3. Framework preset: **Next.js** (auto). Build command and install are auto
   (`pnpm build` runs `prisma generate && next build`; `postinstall` also runs
   `prisma generate`).
4. Add every environment variable from step 3.
5. **Deploy.**

Because local and production share the same Postgres, your data (products,
admin) is already there after step 2 — no extra migration step.

## 5. Custom domain

Vercel → Project → **Settings → Domains** → add `rumart.xyz` and follow the DNS
instructions at your registrar. Then set `NEXT_PUBLIC_SITE_URL=https://rumart.xyz`.

## 6. Turn on crypto payments (NOWPayments)

1. Set `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET` and
   `NOWPAYMENTS_PUBLIC_KEY`.
2. In NOWPayments → **Settings → IPN**, set the callback URL to:
   ```
   https://rumart.xyz/api/webhooks/nowpayments
   ```
   and copy the **IPN Secret key** into `NOWPAYMENTS_IPN_SECRET`.
3. Redeploy. The **Wallet** page now accepts crypto top-ups (USDT TRC20/BEP20,
   BTC, ETH, LTC and more); balances are credited automatically once
   NOWPayments confirms the payment on-chain, and product-linked payments are
   delivered automatically.

## 7. Automatic sync

`vercel.json` schedules `GET /api/cron/sync` **hourly** — it refreshes prices,
availability, and descriptions for every enabled rule. No worker to run.
(For heavier/queued syncing later, add Redis + BullMQ; the sync service is
already structured for it.)

---

### Notes
- SQLite `dev.db` is no longer used; you can delete `prisma/dev.db`.
- Uploaded assets: none today. If you add file uploads, use external storage
  (Vercel Blob / S3) — Vercel's filesystem is ephemeral.
