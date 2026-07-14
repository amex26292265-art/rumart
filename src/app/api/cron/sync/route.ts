import { NextResponse } from "next/server";
import { runAllRules } from "@/lib/sync/sync-service";

/**
 * Periodic sync endpoint. Protected by CRON_SECRET so only your scheduler can
 * trigger it. Wire it up in vercel.json:
 *   { "crons": [{ "path": "/api/cron/sync", "schedule": "0 * * * *" }] }
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
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
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 },
    );
  }
}
