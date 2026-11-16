import type { ComparisonResult } from "@apexlab/contracts";
import { formatDelta, formatLapTime, formatSector } from "@apexlab/analytics";
import { Badge, Card, CardTitle } from "@/components/ui/card";
import { TelemetryPanel } from "@/components/charts";
import { CompoundBadge, LineKey } from "@/components/driver";
import { TrackMap } from "@/components/track-map";
import { DataStatusNotice, EmptyState } from "@/components/states";
import { FadeIn } from "@/components/fade-in";
import { pairColours } from "@/lib/colors";

type Side = ComparisonResult["a"];

function DriverPanel({ s, colour, dashed, align }: { s: Side; colour: string; dashed?: boolean; align: "left" | "right" }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-border bg-elevated/60 p-4 ${align === "right" ? "sm:text-right" : ""}`}>
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: colour }} aria-hidden />
      <div className={`flex items-center gap-2 text-xs text-muted ${align === "right" ? "sm:justify-end" : ""}`}>
        <LineKey colour={colour} dashed={dashed} /> Driver {dashed ? "B" : "A"} · lap {s.lapNumber} <CompoundBadge compound={s.compound} />
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight num" style={{ color: colour }}>{s.abbreviation}</div>
      <div className="text-sm text-fg">{s.displayName}</div>
      <div className="text-xs text-subtle">{s.teamName ?? " "}</div>
      <div className="mt-3 text-3xl font-semibold num sm:text-4xl">{formatLapTime(s.lapTimeMs)}</div>
      {s.isValid === false && <div className="mt-1 text-xs text-warn">Flagged invalid</div>}
    </div>
  );
}

function stats(c: ComparisonResult) {
  const p = c.points;
  const max = (k: "speedA" | "speedB") => {
    const v = p.map((x) => x[k]).filter((x): x is number => x != null);
    return v.length ? Math.max(...v) : null;
  };
  const fullThrottle = (k: "throttleA" | "throttleB") => {
    const v = p.filter((x) => x[k] != null);
    return v.length ? Math.round((v.filter((x) => x[k]! >= 98).length / v.length) * 100) : null;
  };
  const avg = (ms: number | null) => (c.lapLengthM && ms ? (c.lapLengthM / (ms / 1000)) * 3.6 : null);
  return [
    { label: "Top speed", unit: "km/h", a: max("speedA"), b: max("speedB"), higher: true, dp: 0 },
    { label: "Average speed", unit: "km/h", a: avg(c.a.lapTimeMs), b: avg(c.b.lapTimeMs), higher: true, dp: 1 },
    { label: "Full throttle", unit: "% of lap", a: fullThrottle("throttleA"), b: fullThrottle("throttleB"), higher: true, dp: 0 },
  ];
}

export function ComparisonResultView({ c, children }: { c: ComparisonResult; children?: React.ReactNode }) {
  const colours = pairColours(c.a.teamColour, c.b.teamColour);
  const labels = { a: c.a.abbreviation, b: c.b.abbreviation };
  const d = c.lapDeltaMs;
  const verdict = d == null ? "No lap-time delta available" : d === 0 ? "Dead heat" : d < 0 ? `${c.b.abbreviation} faster` : `${c.a.abbreviation} faster`;
  const st = c.points.length ? stats(c) : [];

  return (
    <FadeIn className="space-y-5">
      <DataStatusNotice isDemo={c.source.isDemo} sourceName={c.source.name} warnings={c.warnings} />

      <Card className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="num">{c.session.season}</span><span aria-hidden>·</span>
          <a href={`/events/${c.session.eventKey}`} className="hover:text-fg">{c.session.eventName}</a><span aria-hidden>·</span>
          <a href={`/sessions/${c.session.key}`} className="hover:text-fg">{c.session.name}</a>
          {c.source.isDemo ? <Badge tone="warn">Demo data</Badge> : <Badge tone="live">Real data</Badge>}
        </div>
        <div className="grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <DriverPanel s={c.a} colour={colours.a} align="left" />
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-bg/60 px-6 py-4 text-center">
            <div className="text-xs uppercase tracking-[0.14em] text-muted">Gap B − A</div>
            <div className="mt-1 text-4xl font-bold num sm:text-5xl" style={{ color: d == null || d === 0 ? undefined : d < 0 ? colours.b : colours.a }}>{formatDelta(d)}</div>
            <div className="mt-1 text-sm font-medium">{verdict}</div>
          </div>
          <DriverPanel s={c.b} colour={colours.b} dashed align="right" />
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-fg/90" data-testid="takeaway">{c.summary}</p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardTitle>Track dominance</CardTitle>
          <p className="mb-2 mt-1 text-sm text-muted">Each of the 24 mini-sectors is coloured by the driver who was quicker through it.</p>
          {c.track ? <TrackMap track={c.track} sectors={c.miniSectors} colours={colours} labels={labels} />
            : <EmptyState title="No position data">The car-position feed is missing for this lap, so the circuit cannot be drawn.</EmptyState>}
        </Card>
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardTitle>Sectors</CardTitle>
            <div className="mt-3 divide-y divide-border">
              {[0, 1, 2].map((i) => {
                const sd = c.sectorDeltasMs[i] ?? null;
                const win = sd == null || sd === 0 ? null : sd < 0 ? "b" : "a";
                return (
                  <div key={i} className="grid grid-cols-[2.5rem_1fr_1fr_auto] items-center gap-2 py-2.5 text-sm">
                    <span className="font-semibold text-muted">S{i + 1}</span>
                    <span className="num" style={{ color: win === "a" ? colours.a : undefined }}>{formatSector(c.a.sectorsMs[i])}{win === "a" && <span className="sr-only"> (faster)</span>}</span>
                    <span className="num" style={{ color: win === "b" ? colours.b : undefined }}>{formatSector(c.b.sectorsMs[i])}{win === "b" && <span className="sr-only"> (faster)</span>}</span>
                    <span className="num text-right text-xs text-muted">{formatDelta(sd)}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex gap-4 text-xs text-subtle"><span className="inline-flex items-center gap-1.5"><LineKey colour={colours.a} />{labels.a}</span><span className="inline-flex items-center gap-1.5"><LineKey colour={colours.b} dashed />{labels.b}</span><span>Faster time is coloured.</span></div>
          </Card>
          {st.length > 0 && (
            <Card>
              <CardTitle>Lap statistics</CardTitle>
              <dl className="mt-3 space-y-3">
                {st.map((r) => {
                  const best = r.a == null || r.b == null || r.a === r.b ? null : (r.a > r.b) === r.higher ? "a" : "b";
                  return (
                    <div key={r.label} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-4 text-sm">
                      <dt className="text-muted">{r.label} <span className="text-xs text-subtle">({r.unit})</span></dt>
                      <dd className="num" style={{ color: best === "a" ? colours.a : undefined }}>{r.a == null ? "—" : r.a.toFixed(r.dp)}</dd>
                      <dd className="num" style={{ color: best === "b" ? colours.b : undefined }}>{r.b == null ? "—" : r.b.toFixed(r.dp)}</dd>
                    </div>
                  );
                })}
                {c.lapLengthM && <p className="text-xs text-subtle">Lap length ≈ {(c.lapLengthM / 1000).toFixed(3)} km, integrated from speed.</p>}
              </dl>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Telemetry</CardTitle>
          <div className="flex gap-4 text-sm">
            <span className="inline-flex items-center gap-2"><LineKey colour={colours.a} />{c.a.abbreviation} · L{c.a.lapNumber}</span>
            <span className="inline-flex items-center gap-2"><LineKey colour={colours.b} dashed />{c.b.abbreviation} · L{c.b.lapNumber}</span>
          </div>
        </div>
        {c.points.length ? <TelemetryPanel data={c.points} labels={labels} colours={colours} missing={c.missingSignals} brakeKind={c.brakeKind} />
          : <EmptyState title="No telemetry for this selection">Lap and sector times above are still valid. Pick laps with telemetry to see the traces.</EmptyState>}
        {c.points.length > 0 && (
          <details className="mt-5 rounded-xl border border-border bg-bg/40 p-3 text-sm">
            <summary className="cursor-pointer text-muted hover:text-fg">Data table (accessible alternative to the charts)</summary>
            <div className="mt-3 max-h-80 overflow-auto">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">Aligned telemetry at regular distance intervals</caption>
                <thead className="sticky top-0 bg-surface text-muted"><tr>
                  <th scope="col" className="py-1 pr-3">Distance (m)</th><th scope="col" className="pr-3">{labels.a} km/h</th><th scope="col" className="pr-3">{labels.b} km/h</th><th scope="col" className="pr-3">{labels.a} gear</th><th scope="col" className="pr-3">{labels.b} gear</th><th scope="col">Gap (s)</th>
                </tr></thead>
                <tbody className="num">{c.points.filter((_, i) => i % 25 === 0).map((p) => (
                  <tr key={p.distanceM} className="border-t border-border/60"><td className="py-1 pr-3">{Math.round(p.distanceM)}</td><td className="pr-3">{p.speedA ?? "—"}</td><td className="pr-3">{p.speedB ?? "—"}</td><td className="pr-3">{p.gearA ?? "—"}</td><td className="pr-3">{p.gearB ?? "—"}</td><td>{p.deltaS ?? "—"}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </details>
        )}
      </Card>

      {children}

      <details className="rounded-2xl border border-border bg-surface/60 p-4 sm:p-5">
        <summary className="cursor-pointer font-medium">Methodology, source and limitations</summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">
          {c.methodology.map((m) => <li key={m}>{m}</li>)}
          <li>The takeaway sentence is produced by fixed rules from the numbers above, not by AI.</li>
          <li>Source: {c.source.attribution ?? c.source.name}. Calculation v{c.calculationVersion}.</li>
        </ul>
      </details>
    </FadeIn>
  );
}
