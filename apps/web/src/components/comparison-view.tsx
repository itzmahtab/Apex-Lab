import type { ComparisonResult } from "@apexlab/contracts";
import { formatDelta, formatLapTime, formatSector } from "@apexlab/analytics";
import { Card } from "@/components/ui/card";
import { BrakeChart, DeltaChart, SpeedChart, ThrottleChart } from "@/components/charts";
import { DataStatusNotice, EmptyState } from "@/components/states";

const sideLabel = (s: { abbreviation: string; lapNumber: number }) => `${s.abbreviation} · lap ${s.lapNumber}`;

export function LapDeltaBadge({ ms, a, b }: { ms: number | null; a: string; b: string }) {
  const words = ms == null ? "No delta available" : ms === 0 ? "Identical lap times" : ms < 0 ? `${b} faster` : `${a} faster`;
  return (
    <div>
      <div className="text-4xl sm:text-5xl font-bold tabular-nums">{formatDelta(ms)}</div>
      <div className="text-sm text-muted mt-1">{words} · delta = {b} − {a}</div>
    </div>
  );
}

export function ComparisonSummary({ c }: { c: ComparisonResult }) {
  return (
    <Card aria-labelledby="summary-h">
      <h2 id="summary-h" className="text-lg font-semibold">Lap comparison</h2>
      <p className="text-sm text-muted">{c.session.eventName} · {c.session.name} · {c.session.season}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {[c.a, c.b].map((s, i) => (
          <div key={s.driverKey} className="rounded-lg bg-elevated p-3">
            <div className="text-xs text-muted">{i === 0 ? "Driver A (solid blue line)" : "Driver B (dashed red line)"}</div>
            <div className="font-semibold">{s.displayName} <span className="text-muted">({s.abbreviation})</span></div>
            <div className="text-2xl font-bold tabular-nums mt-1">{formatLapTime(s.lapTimeMs)}</div>
            <div className="text-xs text-muted">Lap {s.lapNumber}{s.isValid === false ? " · flagged invalid" : ""}</div>
          </div>
        ))}
        <div className="rounded-lg bg-elevated p-3 flex items-center"><LapDeltaBadge ms={c.lapDeltaMs} a={c.a.abbreviation} b={c.b.abbreviation} /></div>
      </div>
      <p className="mt-4 text-sm" data-testid="takeaway"><strong>Takeaway:</strong> {c.summary}</p>
    </Card>
  );
}

export function SectorDeltaTable({ c }: { c: ComparisonResult }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold">Sector times</h2>
      <div className="overflow-x-auto">
        <table className="mt-3 w-full text-sm">
          <caption className="sr-only">Sector times in seconds and delta (B minus A)</caption>
          <thead><tr className="text-left text-muted border-b border-border">
            <th scope="col" className="py-2 pr-3">Sector</th>
            <th scope="col" className="py-2 pr-3">{sideLabel(c.a)} (s)</th>
            <th scope="col" className="py-2 pr-3">{sideLabel(c.b)} (s)</th>
            <th scope="col" className="py-2">Δ B − A</th>
          </tr></thead>
          <tbody>
            {[0, 1, 2].map((i) => {
              const d = c.sectorDeltasMs[i] ?? null;
              return (
                <tr key={i} className="border-b border-border/50">
                  <th scope="row" className="py-2 pr-3 font-medium">S{i + 1}</th>
                  <td className="py-2 pr-3 tabular-nums">{formatSector(c.a.sectorsMs[i])}</td>
                  <td className="py-2 pr-3 tabular-nums">{formatSector(c.b.sectorsMs[i])}</td>
                  <td className="py-2 tabular-nums">{formatDelta(d)}{d != null && d !== 0 ? (d < 0 ? ` (${c.b.abbreviation} faster)` : ` (${c.a.abbreviation} faster)`) : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ChartCard({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <Card>
      <h3 className="font-semibold">{title}</h3>
      {note && <p className="text-xs text-muted mb-2">{note}</p>}
      {children}
    </Card>
  );
}

export function TelemetrySection({ c }: { c: ComparisonResult }) {
  const labels = { a: sideLabel(c.a), b: sideLabel(c.b) };
  if (c.points.length === 0)
    return <EmptyState title="No telemetry for this selection">Telemetry charts need an approved artifact for both laps. Lap and sector times above are still valid. Try laps marked “telemetry”.</EmptyState>;
  const has = (s: string) => !c.missingSignals.includes(s);
  const tableRows = c.points.filter((_, i) => i % 50 === 0);
  return (
    <div className="space-y-4">
      {has("speed") && <ChartCard title="Speed vs distance" note="Units: km/h over metres from the start line. Solid = Driver A, dashed = Driver B."><SpeedChart data={c.points} labels={labels} /></ChartCard>}
      {has("time") && <ChartCard title="Cumulative time delta" note="Positive means Driver B is behind Driver A at that point."><DeltaChart data={c.points} labels={labels} /></ChartCard>}
      <div className="grid gap-4 lg:grid-cols-2">
        {has("throttle")
          ? <ChartCard title="Throttle vs distance" note="Percent, 0–100."><ThrottleChart data={c.points} labels={labels} /></ChartCard>
          : <EmptyState title="Throttle unavailable">At least one selected lap has no throttle signal, so the throttle chart is hidden rather than drawn from invented values.</EmptyState>}
        {has("brake")
          ? <ChartCard title="Brake vs distance" note={c.brakeKind === "percent" ? "Brake pressure as percent, 0–100." : "Brake on/off."}><BrakeChart data={c.points} labels={labels} kind={c.brakeKind} /></ChartCard>
          : <EmptyState title="Brake unavailable">The brake signal is missing or not comparable for this selection.</EmptyState>}
      </div>
      <details className="rounded-xl border border-border bg-surface p-4">
        <summary className="cursor-pointer font-medium">Data table (every 500 m)</summary>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm">
            <caption className="sr-only">Aligned telemetry sampled every 500 metres</caption>
            <thead><tr className="text-left text-muted border-b border-border">
              <th scope="col" className="py-1 pr-3">Distance (m)</th><th scope="col" className="pr-3">{labels.a} km/h</th><th scope="col" className="pr-3">{labels.b} km/h</th><th scope="col">Δ time (s)</th>
            </tr></thead>
            <tbody>{tableRows.map((p) => (
              <tr key={p.distanceM} className="border-b border-border/50 tabular-nums">
                <td className="py-1 pr-3">{p.distanceM}</td><td className="pr-3">{p.speedA ?? "—"}</td><td className="pr-3">{p.speedB ?? "—"}</td><td>{p.deltaS ?? "—"}</td>
              </tr>))}</tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

export function MethodologyDisclosure({ c }: { c: ComparisonResult }) {
  return (
    <details className="rounded-xl border border-border bg-surface p-4">
      <summary className="cursor-pointer font-medium">Methodology, source and limitations</summary>
      <ul className="mt-3 list-disc pl-5 text-sm text-muted space-y-1">
        {c.methodology.map((m) => <li key={m}>{m}</li>)}
        <li>Source: {c.source.name} · rights status: {c.source.rightsStatus} · calculation v{c.calculationVersion}.</li>
        <li>The takeaway sentence is generated by deterministic rules from the numbers above, not by AI.</li>
      </ul>
    </details>
  );
}

export function ComparisonResultView({ c, children }: { c: ComparisonResult; children?: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <DataStatusNotice isDemo={c.source.isDemo} sourceName={c.source.name} warnings={c.warnings} />
      <ComparisonSummary c={c} />
      <SectorDeltaTable c={c} />
      <TelemetrySection c={c} />
      {children}
      <MethodologyDisclosure c={c} />
    </div>
  );
}
