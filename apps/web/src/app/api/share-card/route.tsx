import { ImageResponse } from "next/og";
import { formatDelta, formatLapTime } from "@apexlab/analytics";
import { buildComparison } from "@/server/comparison";
import { errorBody } from "@/server/errors";
import { pairColours } from "@/lib/colors";

/** 1200×630 share card. Text and original artwork only: no F1 logos or photos. Always labelled unofficial. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const c = await buildComparison(Object.fromEntries(url.searchParams));
    const col = pairColours(c.a.teamColour, c.b.teamColour);
    const d = c.lapDeltaMs;
    const faster = d == null || d === 0 ? null : d < 0 ? c.b : c.a;
    // Track outline, scaled into a 420×300 box.
    let path = "";
    if (c.track) {
      const p = c.track.points, xs = p.map((q) => q.x), ys = p.map((q) => q.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const k = Math.min(420 / (maxX - minX || 1), 300 / (maxY - minY || 1));
      const ox = (420 - (maxX - minX) * k) / 2, oy = (300 - (maxY - minY) * k) / 2;
      path = p.map((q, i) => `${i ? "L" : "M"}${(ox + (q.x - minX) * k).toFixed(1)} ${(oy + (maxY - q.y) * k).toFixed(1)}`).join(" ");
    }
    const side = (s: typeof c.a, colour: string) => (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", width: 64, height: 6, background: colour, borderRadius: 3 }} />
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: colour, marginTop: 12 }}>{s.abbreviation}</div>
        <div style={{ display: "flex", fontSize: 26, color: "#9AA4B2" }}>{`${s.teamName ?? ""} · lap ${s.lapNumber}`}</div>
        <div style={{ display: "flex", fontSize: 44, marginTop: 6 }}>{formatLapTime(s.lapTimeMs)}</div>
      </div>
    );
    const img = new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", background: "#08090C", color: "#F4F6F8", padding: 56, fontFamily: "sans-serif" }}>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 26, color: "#9AA4B2" }}>
                <span style={{ color: "#F4F6F8", fontWeight: 700 }}>Apex</span><span style={{ color: "#FF453A", fontWeight: 700 }}>Lab</span>
                <span style={{ marginLeft: 16 }}>{c.source.isDemo ? "DEMO DATA (synthetic)" : `${c.session.season} · ${c.session.eventName}`}</span>
              </div>
              <div style={{ display: "flex", fontSize: 30, color: "#9AA4B2", marginTop: 6 }}>{c.session.name}</div>
            </div>
            <div style={{ display: "flex", gap: 64 }}>{side(c.a, col.a)}{side(c.b, col.b)}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
              <span style={{ fontSize: 72, fontWeight: 700 }}>{formatDelta(d)}</span>
              <span style={{ fontSize: 30, color: "#9AA4B2" }}>{faster ? `${faster.abbreviation} faster` : ""}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-end", flex: 1 }}>
            {path ? (
              <svg width="420" height="300" viewBox="0 0 420 300"><path d={path} fill="none" stroke="#313847" strokeWidth="14" strokeLinejoin="round" /><path d={path} fill="none" stroke={faster ? (faster === c.a ? col.a : col.b) : "#F4F6F8"} strokeWidth="5" strokeLinejoin="round" /></svg>
            ) : <div style={{ display: "flex" }} />}
            <div style={{ display: "flex", fontSize: 20, color: "#6B7484", textAlign: "right", maxWidth: 440 }}>Unofficial fan project · data: OpenF1 · not affiliated with Formula 1</div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
    if (url.searchParams.get("download") === "1") img.headers.set("Content-Disposition", 'attachment; filename="apexlab-comparison.png"');
    img.headers.set("Cache-Control", "public, max-age=3600, s-maxage=604800");
    return img;
  } catch (e) {
    const { body, status } = errorBody(e);
    return Response.json(body, { status });
  }
}
