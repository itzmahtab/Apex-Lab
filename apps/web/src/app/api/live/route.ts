import { getLiveSnapshot } from "@/server/live";

export const dynamic = "force-dynamic";

/** GET /api/live → current live-timing snapshot (or the latest session from OpenF1). Polled by /live. */
export async function GET() {
  const snap = await getLiveSnapshot();
  if (!snap) return Response.json({ error: { code: "UPSTREAM_UNAVAILABLE", message: "No timing data is available right now." } }, { status: 503 });
  return Response.json(snap, { headers: { "cache-control": snap.mode === "live" ? "no-store" : "public, max-age=30, s-maxage=60" } });
}
