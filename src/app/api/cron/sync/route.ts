import { NextResponse } from "next/server";
import { runAllRules } from "@/lib/sync/sync-service";
import { prisma } from "@/lib/prisma";

/**
 * Periodic sync endpoint (every 30 minutes via Cloudflare Cron / external ping).
 * Protected by CRON_SECRET. Send `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    const result = await runAllRules();
    await prisma.setting.upsert({
      where: { key: "cron_last_sync" },
      update: { value: new Date().toISOString() },
      create: { key: "cron_last_sync", value: new Date().toISOString() },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 },
    );
  }
}
