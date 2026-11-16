"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { Driver, EventSummary, LapSummary, SessionSummary } from "@apexlab/contracts";
import { formatLapTime } from "@apexlab/analytics";
import { pairColours } from "@/lib/colors";
import { LineKey } from "@/components/driver";

export interface ControlsInitial {
  years: number[];
  year: number;
  events: EventSummary[];
  eventKey: string | null;
  sessions: SessionSummary[];
  sessionKey: string | null;
  drivers: Driver[];
  laps: LapSummary[];
  selection: { a?: string; la?: number; b?: string; lb?: number };
}

const sel = "w-full min-h-11 rounded-xl border border-border bg-elevated px-3 text-sm text-fg transition-colors hover:border-border-strong disabled:opacity-50";

function Field({ id, label, children, extra }: { id: string; label: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{label}{extra}</label>
      {children}
    </div>
  );
}

export function CompareControls({ initial }: { initial: ControlsInitial }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [year, setYear] = useState(initial.year);
  const [events, setEvents] = useState(initial.events);
  const [eventKey, setEventKey] = useState(initial.eventKey);
  const [sessions, setSessions] = useState(initial.sessions);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { a, la, b, lb } = initial.selection;

  useEffect(() => { setYear(initial.year); setEvents(initial.events); setEventKey(initial.eventKey); setSessions(initial.sessions); }, [initial]);

  const go = (q: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== "") p.set(k, String(v));
    start(() => router.push(`/compare?${p.toString()}`, { scroll: false }));
  };

  async function load<T>(url: string, what: string): Promise<T | null> {
    setLoading(what); setError(null);
    try {
      const r = await fetch(url);
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error?.message ?? "Request failed");
      return j as T;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load data");
      return null;
    } finally { setLoading(null); }
  }

  async function pickYear(y: number) {
    setYear(y); setEventKey(null); setSessions([]);
    const j = await load<{ events: EventSummary[] }>(`/api/events?season=${y}`, "events");
    if (j) setEvents(j.events);
  }
  async function pickEvent(k: string) {
    setEventKey(k); setSessions([]);
    const j = await load<{ sessions: SessionSummary[] }>(`/api/sessions?eventId=${encodeURIComponent(k)}`, "sessions");
    if (j) setSessions(j.sessions);
  }

  const lapsOf = (k?: string) => initial.laps.filter((l) => l.driverKey === k).sort((x, y) => x.lapNumber - y.lapNumber);
  const fastestOf = (k?: string) => lapsOf(k).filter((l) => l.lapTimeMs && l.hasTelemetry && !l.isPitOutLap).sort((x, y) => x.lapTimeMs! - y.lapTimeMs!)[0]?.lapNumber;
  const dA = initial.drivers.find((d) => d.key === a), dB = initial.drivers.find((d) => d.key === b);
  const colours = pairColours(dA?.teamColour, dB?.teamColour);
  const session = initial.sessionKey;

  const driverField = (side: "a" | "b") => {
    const key = side === "a" ? a : b, lap = side === "a" ? la : lb, other = side === "a" ? b : a;
    const fastest = fastestOf(key);
    return (
      <div className="grid grid-cols-[1.4fr_1fr] gap-2">
        <Field id={`driver-${side}`} label={`Driver ${side.toUpperCase()}`} extra={key ? <LineKey colour={side === "a" ? colours.a : colours.b} dashed={side === "b"} /> : null}>
          <select id={`driver-${side}`} className={sel} disabled={!session || pending} value={key ?? ""}
            onChange={(e) => go({ session: session!, a: side === "a" ? e.target.value : a, la: side === "a" ? undefined : la, b: side === "b" ? e.target.value : b, lb: side === "b" ? undefined : lb })}>
            <option value="" disabled>Choose…</option>
            {initial.drivers.map((d) => <option key={d.key} value={d.key} disabled={d.key === other}>{d.abbreviation} · {d.displayName}{d.teamName ? ` (${d.teamName})` : ""}</option>)}
          </select>
        </Field>
        <Field id={`lap-${side}`} label="Lap">
          <select id={`lap-${side}`} className={sel} disabled={!key || pending} value={lap ?? ""}
            onChange={(e) => go({ session: session!, a, b, la: side === "a" ? Number(e.target.value) : la, lb: side === "b" ? Number(e.target.value) : lb })}>
            <option value="" disabled>Lap…</option>
            {lapsOf(key).map((l) => (
              <option key={l.lapNumber} value={l.lapNumber} disabled={!l.lapTimeMs}>
                {l.lapNumber === fastest ? "★ " : ""}L{l.lapNumber} · {formatLapTime(l.lapTimeMs)}{l.isPitOutLap ? " · out" : ""}{l.compound ? ` · ${l.compound[0]}` : ""}{!l.hasTelemetry ? " · no telemetry" : ""}
              </option>
            ))}
          </select>
        </Field>
      </div>
    );
  };

  return (
    <section aria-label="Choose a comparison" aria-busy={pending || !!loading}
      className="rounded-2xl border border-border bg-surface/80 p-4 sm:p-5">
      <div className="grid gap-3 md:grid-cols-[0.6fr_1.6fr_1fr]">
        <Field id="season" label="Season">
          <select id="season" className={sel} value={year} onChange={(e) => pickYear(Number(e.target.value))}>
            {initial.years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </Field>
        <Field id="event" label="Grand Prix">
          <select id="event" className={sel} value={eventKey ?? ""} disabled={loading === "events"} onChange={(e) => pickEvent(e.target.value)}>
            <option value="" disabled>{loading === "events" ? "Loading…" : "Choose event…"}</option>
            {events.map((e) => <option key={e.key} value={e.key}>{e.name}{e.location ? ` · ${e.location}` : ""}</option>)}
          </select>
        </Field>
        <Field id="session" label="Session">
          <select id="session" className={sel} value={session && sessions.some((s) => s.key === session) ? session : ""} disabled={!eventKey || loading === "sessions"}
            onChange={(e) => go({ session: e.target.value })}>
            <option value="" disabled>{loading === "sessions" ? "Loading…" : "Choose session…"}</option>
            {sessions.map((s) => <option key={s.key} value={s.key} disabled={s.status !== "completed"}>{s.name}{s.status !== "completed" ? ` (${s.status})` : ""}</option>)}
          </select>
        </Field>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-end">
        {driverField("a")}
        <button type="button" disabled={!a || !b || pending} onClick={() => go({ session: session!, a: b, la: lb, b: a, lb: la })}
          className="min-h-11 rounded-xl border border-border bg-elevated px-3 text-sm text-muted transition-colors hover:border-border-strong hover:text-fg disabled:opacity-40" aria-label="Swap driver A and driver B">
          ⇄ Swap
        </button>
        {driverField("b")}
      </div>
      <p className="mt-3 min-h-5 text-xs text-subtle" role="status">
        {error ? <span className="text-accent">{error}</span> : pending ? "Loading comparison…" : loading ? `Loading ${loading}…` : "★ marks each driver's fastest lap. Your selection lives in the URL, so the page link is the share link."}
      </p>
    </section>
  );
}
