import { z } from "zod";
import { getTrackForRound } from "@/server/season";

const q = z.object({ season: z.coerce.number().int().min(2023).max(2100), round: z.coerce.number().int().min(1).max(40) });

/** GET /api/circuit-track?season=2026&round=22 → timed x/y/z positions of a recent fast lap, or null. */
export async function GET(req: Request) {
  const p = q.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!p.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: "season and round are required" } }, { status: 400 });
  const track = await getTrackForRound(p.data.season, p.data.round);
  return Response.json(track, { headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
}
