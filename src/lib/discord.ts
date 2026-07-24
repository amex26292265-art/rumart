/**
 * Discord admin webhook notifications for Rumart ops.
 * Configure via Setting key `discord_webhook_url` or env DISCORD_WEBHOOK_URL.
 */

import { prisma } from "@/lib/prisma";

type DiscordEmbed = {
  title: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
};

async function resolveWebhookUrl(): Promise<string | null> {
  if (process.env.DISCORD_WEBHOOK_URL) return process.env.DISCORD_WEBHOOK_URL;
  try {
    const row = await prisma.setting.findUnique({ where: { key: "discord_webhook_url" } });
    return row?.value || null;
  } catch {
    return null;
  }
}

export async function notifyDiscord(payload: {
  content?: string;
  embed?: DiscordEmbed;
}) {
  const url = await resolveWebhookUrl();
  if (!url) return { ok: false as const, skipped: true };

  try {
    const body: Record<string, unknown> = {
      username: "Rumart Ops",
      content: payload.content,
    };
    if (payload.embed) {
      body.embeds = [
        {
          ...payload.embed,
          color: payload.embed.color ?? 0x7c3aed,
          timestamp: payload.embed.timestamp ?? new Date().toISOString(),
        },
      ];
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function discordEvent(
  title: string,
  description: string,
  fields?: DiscordEmbed["fields"],
) {
  return notifyDiscord({
    embed: { title, description, fields },
  });
}
