import type { MiniSector, TrackMap as TrackMapData } from "@apexlab/contracts";

/**
 * Track dominance map: the circuit outline (from car position data), each mini-sector
 * coloured by the driver who was quicker through it. Server-rendered SVG.
 */
export function TrackMap({ track, sectors, colours, labels, compact = false }: {
  track: TrackMapData; sectors: MiniSector[]; colours: { a: string; b: string }; labels: { a: string; b: string }; compact?: boolean;
}) {
  const pts = track.points;
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX || 1, h = maxY - minY || 1;
  const pad = Math.max(w, h) * 0.06;
  // position y grows "up" in the source; SVG y grows down
  const P = (p: { x: number; y: number }) => `${(p.x - minX + pad).toFixed(0)},${(maxY - p.y + pad).toFixed(0)}`;
  const stroke = Math.max(w, h) / 70;

  // Group consecutive points by mini-sector into polylines (overlap one point so there are no gaps).
  const runs: { s: number; d: string }[] = [];
  let cur: { s: number; pts: string[] } | null = null;
  for (const p of pts) {
    if (!cur || cur.s !== p.s) {
      if (cur) { cur.pts.push(P(p)); runs.push({ s: cur.s, d: cur.pts.join(" ") }); }
      cur = { s: p.s, pts: [P(p)] };
    } else cur.pts.push(P(p));
  }
  if (cur) runs.push({ s: cur.s, d: cur.pts.join(" ") });

  const winner = (i: number) => sectors[i]?.winner;
  const colourOf = (i: number) => (winner(i) === "a" ? colours.a : winner(i) === "b" ? colours.b : "#4b5363");
  const aWins = sectors.filter((s) => s.winner === "a").length, bWins = sectors.filter((s) => s.winner === "b").length;
  const start = pts[0]!;
  const summary = `Track dominance: ${labels.a} was quicker in ${aWins} of ${sectors.length} mini-sectors, ${labels.b} in ${bWins}.`;

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${w + pad * 2} ${h + pad * 2}`} className={compact ? "h-56 w-full" : "h-72 w-full sm:h-96"} role="img" aria-label={summary}>
        <polyline points={pts.map(P).join(" ")} fill="none" stroke="#000" strokeOpacity="0.55" strokeWidth={stroke * 2.4} strokeLinejoin="round" strokeLinecap="round" />
        {runs.map((r, i) => (
          <polyline key={i} points={r.d} fill="none" stroke={colourOf(r.s)} strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round"
            strokeDasharray={winner(r.s) === "b" ? `${stroke * 2.2} ${stroke * 1.1}` : undefined} />
        ))}
        <circle cx={P(start).split(",")[0]} cy={P(start).split(",")[1]} r={stroke * 1.4} fill="#F4F6F8" stroke="#08090c" strokeWidth={stroke * 0.5} />
      </svg>
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
        <span className="inline-flex items-center gap-2"><svg width="22" height="8" aria-hidden><line x1="1" y1="4" x2="21" y2="4" stroke={colours.a} strokeWidth="4" strokeLinecap="round" /></svg>{labels.a} quicker <b className="num text-fg">{aWins}</b></span>
        <span className="inline-flex items-center gap-2"><svg width="22" height="8" aria-hidden><line x1="1" y1="4" x2="21" y2="4" stroke={colours.b} strokeWidth="4" strokeLinecap="round" strokeDasharray="6 3" /></svg>{labels.b} quicker <b className="num text-fg">{bWins}</b></span>
        {sectors.some((x) => x.winner === "tie") && <span className="inline-flex items-center gap-2"><svg width="22" height="8" aria-hidden><line x1="1" y1="4" x2="21" y2="4" stroke="#4b5363" strokeWidth="4" strokeLinecap="round" /></svg>Within 5 ms</span>}
        <span className="inline-flex items-center gap-2"><svg width="10" height="10" aria-hidden><circle cx="5" cy="5" r="4" fill="#F4F6F8" /></svg>Start / finish</span>
      </figcaption>
    </figure>
  );
}
