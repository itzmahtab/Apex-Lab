"use client";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartPoint } from "@apexlab/contracts";

const COLOR_A = "#56B4E9"; // telemetry blue — A is also solid
const COLOR_B = "#FF453A"; // racing red — B is also dashed (identity never by color alone)

export interface ChartLabels { a: string; b: string }

function Base({ title, unit, data, labels, keys, domain, height = 260, summary }: {
  title: string; unit: string; data: ChartPoint[]; labels: ChartLabels;
  keys: [keyof ChartPoint, keyof ChartPoint]; domain?: [number | "auto", number | "auto"]; height?: number; summary: string;
}) {
  return (
    <figure aria-label={`${title} chart`} className="m-0">
      <div style={{ height }} role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 18, left: 0 }}>
            <CartesianGrid stroke="#2A303A" strokeDasharray="3 3" />
            <XAxis dataKey="distanceM" type="number" domain={[0, "dataMax"]} tick={{ fill: "#A7B0BC", fontSize: 12 }}
              label={{ value: "Distance (m)", position: "insideBottom", offset: -10, fill: "#A7B0BC", fontSize: 12 }} />
            <YAxis domain={domain ?? ["auto", "auto"]} width={48} tick={{ fill: "#A7B0BC", fontSize: 12 }}
              label={{ value: unit, angle: -90, position: "insideLeft", fill: "#A7B0BC", fontSize: 12 }} />
            <Tooltip contentStyle={{ background: "#1B2029", border: "1px solid #2A303A", borderRadius: 8, color: "#F4F6F8" }}
              labelFormatter={(v) => `${v} m`} formatter={(v) => (v == null ? "no data" : `${v} ${unit}`)} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ color: "#A7B0BC", fontSize: 12 }} />
            <Line name={labels.a} dataKey={keys[0] as string} stroke={COLOR_A} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
            <Line name={labels.b} dataKey={keys[1] as string} stroke={COLOR_B} strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

const nums = (pts: ChartPoint[], k: keyof ChartPoint) => pts.map((p) => p[k]).filter((v): v is number => typeof v === "number");
const range = (pts: ChartPoint[], k: keyof ChartPoint) => {
  const v = nums(pts, k);
  return v.length ? `${Math.min(...v).toFixed(0)}–${Math.max(...v).toFixed(0)}` : "no data";
};

export function SpeedChart({ data, labels, height }: { data: ChartPoint[]; labels: ChartLabels; height?: number }) {
  return <Base title="Speed vs distance" unit="Speed (km/h)" data={data} labels={labels} keys={["speedA", "speedB"]} height={height}
    summary={`Speed against distance. ${labels.a} ranges ${range(data, "speedA")} km/h; ${labels.b} ranges ${range(data, "speedB")} km/h.`} />;
}
export function ThrottleChart({ data, labels }: { data: ChartPoint[]; labels: ChartLabels }) {
  return <Base title="Throttle vs distance" unit="Throttle (%)" data={data} labels={labels} keys={["throttleA", "throttleB"]} domain={[0, 100]}
    summary={`Throttle position in percent against distance. ${labels.a} ranges ${range(data, "throttleA")} %; ${labels.b} ranges ${range(data, "throttleB")} %.`} />;
}
export function BrakeChart({ data, labels, kind }: { data: ChartPoint[]; labels: ChartLabels; kind: "percent" | "boolean" }) {
  return <Base title="Brake vs distance" unit={kind === "percent" ? "Brake (%)" : "Brake (on/off)"} data={data} labels={labels} keys={["brakeA", "brakeB"]} domain={[0, 100]}
    summary={`Brake application (${kind}) against distance. ${labels.a} ranges ${range(data, "brakeA")}; ${labels.b} ranges ${range(data, "brakeB")}.`} />;
}
export function DeltaChart({ data, labels }: { data: ChartPoint[]; labels: ChartLabels }) {
  const last = [...data].reverse().find((p) => p.deltaS != null)?.deltaS;
  const summary = `Cumulative time delta (${labels.b} minus ${labels.a}) in seconds against distance. Positive means ${labels.b} is behind. Final value ${last == null ? "unavailable" : `${last > 0 ? "+" : ""}${last} s`}.`;
  return (
    <figure aria-label="Cumulative time delta chart" className="m-0">
      <div style={{ height: 220 }} role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 18, left: 0 }}>
            <CartesianGrid stroke="#2A303A" strokeDasharray="3 3" />
            <XAxis dataKey="distanceM" type="number" domain={[0, "dataMax"]} tick={{ fill: "#A7B0BC", fontSize: 12 }}
              label={{ value: "Distance (m)", position: "insideBottom", offset: -10, fill: "#A7B0BC", fontSize: 12 }} />
            <YAxis width={56} tick={{ fill: "#A7B0BC", fontSize: 12 }} label={{ value: "Δ time (s)", angle: -90, position: "insideLeft", fill: "#A7B0BC", fontSize: 12 }} />
            <ReferenceLine y={0} stroke="#A7B0BC" />
            <Tooltip contentStyle={{ background: "#1B2029", border: "1px solid #2A303A", borderRadius: 8, color: "#F4F6F8" }}
              labelFormatter={(v) => `${v} m`} formatter={(v) => (v == null ? "no data" : `${Number(v) > 0 ? "+" : ""}${v} s`)} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ color: "#A7B0BC", fontSize: 12 }} />
            <Line name={`${labels.b} − ${labels.a} (+ = ${labels.b} behind)`} dataKey="deltaS" stroke="#F6C453" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}
