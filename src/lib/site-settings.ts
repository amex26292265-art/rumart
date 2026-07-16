import { prisma } from "@/lib/prisma";

/**
 * Editable, DB-backed site settings (managed in Admin → Settings).
 * Falls back to sensible defaults so the site always renders.
 */
export const SITE_SETTING_KEYS = [
  "telegramHandle",
  "supportNote",
  "brandTagline",
] as const;

export type SiteSettingKey = (typeof SITE_SETTING_KEYS)[number];

const DEFAULTS: Record<SiteSettingKey, string> = {
  telegramHandle: "rumartxyz",
  supportNote:
    "We have received your payment successfully. Your order is waiting for manual fulfillment because it could not be completed automatically. Please contact our support on Telegram and we’ll deliver it right away.",
  brandTagline: "Instant, automated delivery of premium digital goods.",
};

export interface SiteSettings {
  telegramHandle: string;
  telegramUrl: string;
  supportNote: string;
  brandTagline: string;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const rows = await prisma.setting.findMany({ where: { key: { in: [...SITE_SETTING_KEYS] } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const telegramHandle = (map.get("telegramHandle") || DEFAULTS.telegramHandle).replace(/^@/, "");
  return {
    telegramHandle,
    telegramUrl: `https://t.me/${telegramHandle}`,
    supportNote: map.get("supportNote") || DEFAULTS.supportNote,
    brandTagline: map.get("brandTagline") || DEFAULTS.brandTagline,
  };
}

/** Build a t.me deep link with a prefilled message. */
export function telegramContactUrl(handle: string, message: string): string {
  return `https://t.me/${handle.replace(/^@/, "")}?text=${encodeURIComponent(message)}`;
}
