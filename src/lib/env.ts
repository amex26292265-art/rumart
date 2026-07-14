import { z } from "zod";

/**
 * Server-side environment. Validated once at import so misconfiguration fails
 * loudly instead of surfacing as confusing runtime errors deep in a service.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  SECRETS_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "SECRETS_ENCRYPTION_KEY must be 64 hex characters (32 bytes)"),
  LZT_API_BASE: z.string().url().default("https://prod-api.lolz.live"),
  LZT_API_TOKEN: z.string().default(""),
  REDIS_URL: z.string().default(""),
  SITE_CURRENCY: z.string().default("USD"),
  NEXT_PUBLIC_SITE_URL: z.string().default("http://localhost:3000"),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  // Cryptomus crypto payment gateway (optional until you add keys).
  CRYPTOMUS_MERCHANT_ID: z.string().default(""),
  CRYPTOMUS_PAYMENT_KEY: z.string().default(""),
});

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  SECRETS_ENCRYPTION_KEY: process.env.SECRETS_ENCRYPTION_KEY,
  LZT_API_BASE: process.env.LZT_API_BASE,
  LZT_API_TOKEN: process.env.LZT_API_TOKEN,
  REDIS_URL: process.env.REDIS_URL,
  SITE_CURRENCY: process.env.SITE_CURRENCY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  CRYPTOMUS_MERCHANT_ID: process.env.CRYPTOMUS_MERCHANT_ID,
  CRYPTOMUS_PAYMENT_KEY: process.env.CRYPTOMUS_PAYMENT_KEY,
});

/** True when a real LZT token is configured — otherwise the catalog stays empty. */
export const isSupplierConfigured = env.LZT_API_TOKEN.length > 0;

/** True when Cryptomus keys are present — otherwise crypto top-up is disabled. */
export const isPaymentsConfigured =
  env.CRYPTOMUS_MERCHANT_ID.length > 0 && env.CRYPTOMUS_PAYMENT_KEY.length > 0;
