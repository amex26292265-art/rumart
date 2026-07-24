import { NextResponse } from "next/server";
import { purgeBadProducts, runAllRules } from "@/lib/sync/sync-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Ops endpoint: purge junk/no-capture listings, optionally re-sync.
 * Auth: Bearer MIGRATE_SECRET or CRON_SECRET.
 *
 * POST /api/admin/purge-capture
 * body JSON: { "sync": true } to also run enabled sync rules after purge.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const expected = process.env.MIGRATE_SECRET || process.env.CRON_SECRET || "";
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let sync = false;
  try {
    const body = (await req.json()) as { sync?: boolean };
    sync = Boolean(body?.sync);
  } catch {
    sync = false;
  }

  try {
    const purged = await purgeBadProducts();
    if (!sync) {
      return NextResponse.json({ ok: true, purged: purged.deleted, ids: purged.ids.slice(0, 50) });
    }

    const result = await runAllRules();
    return NextResponse.json({
      ok: true,
      purged: purged.deleted,
      imported: result.imported,
      updated: result.updated,
      removed: result.removed,
      runId: result.runId,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "purge/sync failed" },
      { status: 500 },
    );
  }
}
