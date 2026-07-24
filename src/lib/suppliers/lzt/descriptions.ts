import type { TitleAttrs } from "@/lib/suppliers/lzt/titles";

/**
 * Professional listing copy — never publish bare "Steam Account" descriptions.
 */
export function buildProfessionalDescription(input: {
  categorySlug: string;
  title: string;
  attrs: TitleAttrs;
}): string {
  const lead = input.title;
  const games = (input.attrs.games ?? []).slice(0, 12);
  const highlights: string[] = [];

  if (input.attrs.emailNative) highlights.push("Full email access included");
  if (input.attrs.personal) highlights.push("Personal / transferable workspace");
  if (input.attrs.sda) highlights.push("Steam Desktop Authenticator ready");
  if (input.attrs.vac === false) highlights.push("Clean VAC status");
  if (input.attrs.vac === true) highlights.push("VAC noted — priced accordingly");
  if (input.attrs.level != null) highlights.push(`Level ${input.attrs.level}`);
  if (input.attrs.country) highlights.push(`Registered region: ${input.attrs.country}`);
  if (input.attrs.warranty) highlights.push(`Warranty: ${input.attrs.warranty}`);

  for (const s of input.attrs.stats ?? []) {
    if (s.label && s.value) highlights.push(`${s.label}: ${s.value}`);
  }

  const featureLines = [
    ...highlights.slice(0, 8).map((h) => `• ${h}`),
    ...(games.length ? [`• Featured library: ${games.join(" · ")}`] : []),
  ];

  const delivery = [
    "Delivery: instant after payment confirmation.",
    "Credentials unlock in your Rumart order vault (AES-256-GCM).",
    "Change password and enable 2FA immediately after purchase.",
  ];

  return [
    lead,
    "",
    "Highlights",
    featureLines.length ? featureLines.join("\n") : "• Professionally curated digital listing with verified capture data.",
    "",
    "Specifications",
    `• Category: ${input.categorySlug}`,
    input.attrs.origin ? `• Origin note: ${input.attrs.origin}` : null,
    "",
    "Delivery",
    ...delivery.map((d) => `• ${d.replace(/^Delivery: /, "").replace(/^Credentials /, "Credentials ")}`),
  ]
    .filter((line) => line !== null)
    .join("\n");
}
