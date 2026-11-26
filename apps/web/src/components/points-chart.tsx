"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Progression } from "@/server/season";

/** Cumulative championship points for the top six, round by round. Teammates are dashed. */
export function PointsChart({ data }: { data: Progression }) {
  const rows = data.rounds.map((r, i) => ({ label: r.label, round: r.round, ...Object.fromEntries(data.series.map((s) => [s.code, s.points[i]])) }));
  const leader = data.series[0];
  const summary = leader ? `Points progression: ${data.series.map((s) => `${s.code} ${s.points.at(-1)}`).join(", ")} after round ${data.rounds.at(-1)?.round}.` : "";
  return (
    <figure className="m-0">
      <div className="h-72 sm:h-80" role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#3a3a3a" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#8a8a8a", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#a9a9a9" }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "#8a8a8a", fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              contentStyle={{ background: "#0e0e0e", border: "2px solid #a9a9a9", borderRadius: 8, fontSize: 12, fontFamily: "var(--font-mono)", boxShadow: "4px 4px 0 #0047ab" }}
              labelStyle={{ color: "#a9a9a9" }}
              labelFormatter={(l, p) => `Round ${p?.[0]?.payload?.round ?? ""} · ${l}`}
              itemSorter={(i) => -Number(i.value)}
              formatter={(v, n) => [`${v} pts`, n]}
            />
            {data.series.map((s) => (
              <Line key={s.code} dataKey={s.code} stroke={s.colour} strokeWidth={2.6} dot={false} type="linear" strokeDasharray={s.dashed ? "6 4" : undefined} isAnimationActive />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mono mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        {data.series.map((s) => (
          <span key={s.code} className="inline-flex items-center gap-1.5">
            <svg width="20" height="6" aria-hidden><line x1="1" y1="3" x2="19" y2="3" stroke={s.colour} strokeWidth="3" strokeDasharray={s.dashed ? "5 3" : undefined} strokeLinecap="round" /></svg>
            <span className="text-fg">{s.code}</span> {s.points.at(-1)}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
