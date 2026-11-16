import { ImageResponse } from "next/og";
import { formatDelta, formatLapTime } from "@apexlab/analytics";
import { buildComparison } from "@/server/comparison";
import { errorBody } from "@/server/errors";

/** 1200x630 share card. Text-only: no F1 logos/photos. Always labelled unofficial (+ demo when synthetic). */
export async function GET(req: Request) {
  try {
    const c = await buildComparison(Object.fromEntries(new URL(req.url).searchParams));
    const download = new URL(req.url).searchParams.get("download") === "1";
    const img = new ImageResponse(
      (
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", background: "#0B0D10", color: "#F4F6F8", padding: 56, fontFamily: "sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#A7B0BC" }}>
            <span>APEXLAB · The science behind the speed</span>
            {c.source.isDemo ? <span style={{ color: "#F6C453" }}>DEMO DATA (synthetic)</span> : <span />}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, color: "#A7B0BC" }}>{`${c.session.eventName} · ${c.session.name}`}</div>
            <div style={{ display: "flex", fontSize: 76, fontWeight: 700, marginTop: 8 }}>
              <span style={{ color: "#56B4E9" }}>{c.a.abbreviation}</span>
              <span style={{ margin: "0 24px", color: "#A7B0BC" }}>vs</span>
              <span style={{ color: "#FF453A" }}>{c.b.abbreviation}</span>
            </div>
            <div style={{ display: "flex", fontSize: 40, marginTop: 20 }}>
              <span>{`${formatLapTime(c.a.lapTimeMs)} (L${c.a.lapNumber})`}</span>
              <span style={{ margin: "0 24px", color: "#A7B0BC" }}>/</span>
              <span>{`${formatLapTime(c.b.lapTimeMs)} (L${c.b.lapNumber})`}</span>
            </div>
            <div style={{ fontSize: 64, fontWeight: 700, marginTop: 16 }}>{`Δ ${formatDelta(c.lapDeltaMs)} (B − A)`}</div>
          </div>
          <div style={{ fontSize: 22, color: "#A7B0BC" }}>Independent fan project. Not affiliated with Formula 1 or any team.</div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
    if (download) img.headers.set("Content-Disposition", 'attachment; filename="apexlab-comparison.png"');
    img.headers.set("Cache-Control", "public, max-age=300, s-maxage=3600");
    return img;
  } catch (e) {
    const { body, status } = errorBody(e);
    return Response.json(body, { status });
  }
}
