"use client";
import { Area, CartesianGrid, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartPoint } from "@apexlab/contracts";

export interface Pair { a: string; b: string }

const AXIS = { fill: "#6b7484", fontSize: 11 };
const GRID = "#1d222b";

type Key = keyof ChartPoint;

function TooltipBox({ active, payload, label, unit, labels, colours, digits = 0 }: {
  active?: boolean; payload?: { dataKey?: unknown; value?: unknown }[]; label?: unknown; unit: string; labels: Pair; colours: Pair; digits?: number;
}) {
  if (!active || !payload?.length) return null;
  const v = (k: string) => payload.find((p) => String(p.dataKey).endsWith(k))?.value as number | null | undefined;
  const fmt = (x: number | null | undefined) => (x == null ? "no data" : `${x.toFixed(digits)} ${unit}`);
  return (
    <div className="rounded-xl border border-border-strong bg-[#0d1015]/95 px-3 py-2 text-xs shadow-2xl backdrop-blur">
      <div className="mb-1 text-subtle num">{Math.round(Number(label))} m</div>
      <div className="flex items-center gap-2" style={{ color: colours.a }}><span className="w-9 font-semibold">{labels.a}</span><span className="num text-fg">{fmt(v("A"))}</span></div>
      <div className="flex items-center gap-2" style={{ color: colours.b }}><span className="w-9 font-semibold">{labels.b}</span><span className="num text-fg">{fmt(v("B"))}</span></div>
    </div>
  );
}

function Panel({ title, unit, data, keys, colours, labels, height, domain, ticks, digits, step = false, syncId, showX = false }: {
  title: string; unit: string; data: ChartPoint[]; keys: [Key, Key]; colours: Pair; labels: Pair; height: number;
  domain?: [number | "auto", number | "auto"]; ticks?: number[]; digits?: number; step?: boolean; syncId?: string; showX?: boolean;
}) {
  const type = step ? "stepAfter" : "monotone";
  return (
    <section aria-label={title}>
      <div className="mb-1 flex items-baseline justify-between"><h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted">{title}</h3><span className="text-[11px] text-subtle">{unit}</span></div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} syncId={syncId} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="distanceM" type="number" domain={[0, "dataMax"]} tick={AXIS} tickLine={false} axisLine={false} hide={!showX} tickFormatter={(v) => `${(v / 1000).toFixed(1)} km`} />
            <YAxis domain={domain ?? ["auto", "auto"]} ticks={ticks} tick={AXIS} tickLine={false} axisLine={false} width={44} />
            <Tooltip cursor={{ stroke: "#9aa4b2", strokeWidth: 1, strokeDasharray: "3 3" }} isAnimationActive={false}
              content={(p) => <TooltipBox {...(p as object)} unit={unit} labels={labels} colours={colours} digits={digits} />} />
            <Line type={type} dataKey={keys[0] as string} stroke={colours.a} strokeWidth={1.8} dot={false} connectNulls={false} isAnimationActive={false} />
            <Line type={type} dataKey={keys[1] as string} stroke={colours.b} strokeWidth={1.8} strokeDasharray="5 3" dot={false} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function DeltaPanel({ data, labels, colours, syncId }: { data: ChartPoint[]; labels: Pair; colours: Pair; syncId: string }) {
  const rows = data.map((p) => ({ ...p, ahead: p.deltaS != null && p.deltaS > 0 ? p.deltaS : 0, behind: p.deltaS != null && p.deltaS < 0 ? p.deltaS : 0 }));
  return (
    <section aria-label="Gap">
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Gap {labels.b} − {labels.a}</h3>
        <span className="text-[11px] text-subtle">s · above zero = {labels.a} ahead</span>
      </div>
      <div style={{ height: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} syncId={syncId} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="distanceM" type="number" domain={[0, "dataMax"]} hide />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2))} />
            <ReferenceLine y={0} stroke="#4b5363" />
            <Area type="monotone" dataKey="ahead" stroke="none" fill={colours.a} fillOpacity={0.18} isAnimationActive={false} />
            <Area type="monotone" dataKey="behind" stroke="none" fill={colours.b} fillOpacity={0.18} isAnimationActive={false} />
            <Tooltip cursor={{ stroke: "#9aa4b2", strokeWidth: 1, strokeDasharray: "3 3" }} isAnimationActive={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = (payload[0]?.payload as ChartPoint | undefined)?.deltaS;
                return (
                  <div className="rounded-xl border border-border-strong bg-[#0d1015]/95 px-3 py-2 text-xs shadow-2xl">
                    <div className="mb-1 text-subtle num">{Math.round(Number(label))} m</div>
                    <div className="num text-fg">{d == null ? "no data" : d === 0 ? "level" : `${d > 0 ? labels.a : labels.b} ahead by ${Math.abs(d).toFixed(3)} s`}</div>
                  </div>
                );
              }} />
            <Line type="monotone" dataKey="deltaS" stroke="#F4F6F8" strokeWidth={1.6} dot={false} connectNulls={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function TelemetryPanel({ data, labels, colours, missing, brakeKind }: {
  data: ChartPoint[]; labels: Pair; colours: Pair; missing: string[]; brakeKind: "percent" | "boolean";
}) {
  const has = (s: string) => !missing.includes(s);
  const sync = "lap";
  const panels: React.ReactNode[] = [];
  if (has("speed")) panels.push(<Panel key="s" title="Speed" unit="km/h" data={data} keys={["speedA", "speedB"]} colours={colours} labels={labels} height={240} syncId={sync} />);
  if (has("time")) panels.push(<DeltaPanel key="d" data={data} labels={labels} colours={colours} syncId={sync} />);
  if (has("throttle")) panels.push(<Panel key="t" title="Throttle" unit="%" data={data} keys={["throttleA", "throttleB"]} colours={colours} labels={labels} height={120} domain={[0, 100]} ticks={[0, 50, 100]} syncId={sync} />);
  if (has("brake")) panels.push(<Panel key="b" title="Brake" unit={brakeKind === "boolean" ? "on/off" : "%"} data={data} keys={["brakeA", "brakeB"]} colours={colours} labels={labels} height={90} domain={[0, 100]} ticks={[0, 100]} step={brakeKind === "boolean"} syncId={sync} />);
  panels.push(<Panel key="g" title="Gear" unit="gear" data={data} keys={["gearA", "gearB"]} colours={colours} labels={labels} height={110} domain={[1, 8]} ticks={[2, 4, 6, 8]} step syncId={sync} showX />);
  return <div className="space-y-5">{panels}</div>;
}

/** Compact speed trace for cards and the landing page. */
export function SpeedSparkline({ data, colours, height = 140 }: { data: ChartPoint[]; colours: Pair; height?: number }) {
  return (
    <div style={{ height }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <XAxis dataKey="distanceM" type="number" domain={[0, "dataMax"]} hide />
          <YAxis hide domain={["dataMin - 10", "dataMax + 10"]} />
          <Line type="monotone" dataKey="speedA" stroke={colours.a} strokeWidth={1.6} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="speedB" stroke={colours.b} strokeWidth={1.6} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
