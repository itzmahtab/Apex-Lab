"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Catalog } from "@apexlab/contracts";
import { formatLapTime } from "@apexlab/analytics";
import { Card } from "@/components/ui/card";

export interface Selection { session?: string; a?: string; la?: number; b?: string; lb?: number }

const sel = "w-full min-h-10 rounded-lg border border-border bg-elevated px-3 text-sm text-fg";

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="block text-xs text-muted mb-1">{label}</label>{children}</div>;
}

export function CompareControls({ catalog, value }: { catalog: Catalog; value: Selection }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const session = catalog.sessions.find((s) => s.key === value.session) ?? null;
  const event = catalog.events.find((e) => e.key === session?.eventKey) ?? null;
  const season = catalog.seasons.find((s) => event && s.eventKeys.includes(event.key)) ?? null;

  const go = (next: Selection) => {
    const p = new URLSearchParams();
    if (next.session) p.set("session", next.session);
    if (next.a) p.set("a", next.a);
    if (next.la) p.set("la", String(next.la));
    if (next.b) p.set("b", next.b);
    if (next.lb) p.set("lb", String(next.lb));
    start(() => router.push(`/compare?${p.toString()}`, { scroll: false }));
  };
  /** Best valid lap with telemetry (falls back to any lap with telemetry). */
  const defaultLap = (s: typeof session | undefined, drv: string) => {
    const laps = s?.laps.filter((l) => l.driverKey === drv && l.hasTelemetry) ?? [];
    const valid = laps.filter((l) => l.isValid !== false && l.lapTimeMs != null).sort((x, y) => x.lapTimeMs! - y.lapTimeMs!);
    return (valid[0] ?? laps[0])?.lapNumber;
  };
  const pickSession = (key: string) => {
    const s = catalog.sessions.find((x) => x.key === key);
    const [d1, d2] = s?.drivers ?? [];
    go({ session: key, a: d1?.key, la: d1 && defaultLap(s, d1.key), b: d2?.key, lb: d2 && defaultLap(s, d2.key) });
  };
  const eventsOfSeason = season ? catalog.events.filter((e) => season.eventKeys.includes(e.key)) : [];

  const driverBlock = (side: "a" | "b") => {
    const drvKey = value[side];
    const lapKey = side === "a" ? value.la : value.lb;
    const other = side === "a" ? value.b : value.a;
    const laps = session?.laps.filter((l) => l.driverKey === drvKey) ?? [];
    return (
      <>
        <Field id={`driver-${side}`} label={side === "a" ? "Driver A" : "Driver B"}>
          <select id={`driver-${side}`} className={sel} disabled={!session} value={drvKey ?? ""}
            onChange={(e) => go({ ...value, [side]: e.target.value, [side === "a" ? "la" : "lb"]: defaultLap(session, e.target.value) })}>
            <option value="" disabled>Choose driver…</option>
            {session?.drivers.map((d) => <option key={d.key} value={d.key} disabled={d.key === other}>{d.displayName} ({d.abbreviation})</option>)}
          </select>
        </Field>
        <Field id={`lap-${side}`} label={`Lap (${side.toUpperCase()})`}>
          <select id={`lap-${side}`} className={sel} disabled={!drvKey} value={lapKey ?? ""}
            onChange={(e) => go({ ...value, [side === "a" ? "la" : "lb"]: Number(e.target.value) })}>
            <option value="" disabled>Choose lap…</option>
            {laps.map((l) => (
              <option key={l.lapNumber} value={l.lapNumber}>
                Lap {l.lapNumber} · {formatLapTime(l.lapTimeMs)}{l.isValid === false ? " · invalid" : ""}{l.hasTelemetry ? " · telemetry" : " · times only"}
              </option>
            ))}
          </select>
        </Field>
      </>
    );
  };

  return (
    <Card aria-label="Comparison selectors" aria-busy={pending}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field id="season" label="Season">
          <select id="season" className={sel} value={season?.year ?? ""} onChange={(e) => {
            const s = catalog.seasons.find((x) => x.year === Number(e.target.value));
            const ev = catalog.events.find((x) => x.key === s?.eventKeys[0]);
            if (ev?.sessionKeys[0]) pickSession(ev.sessionKeys[0]);
          }}>
            <option value="" disabled>Choose season…</option>
            {catalog.seasons.map((s) => <option key={s.year} value={s.year}>{s.year}</option>)}
          </select>
        </Field>
        <Field id="event" label="Event">
          <select id="event" className={sel} disabled={!season} value={event?.key ?? ""} onChange={(e) => {
            const k = catalog.events.find((x) => x.key === e.target.value)?.sessionKeys[0];
            if (k) pickSession(k);
          }}>
            <option value="" disabled>Choose event…</option>
            {eventsOfSeason.map((e) => <option key={e.key} value={e.key}>{e.name}</option>)}
          </select>
        </Field>
        <Field id="session" label="Session">
          <select id="session" className={sel} disabled={!event} value={session?.key ?? ""} onChange={(e) => pickSession(e.target.value)}>
            <option value="" disabled>Choose session…</option>
            {catalog.sessions.filter((s) => s.eventKey === event?.key).map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
          </select>
        </Field>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="grid gap-3">{driverBlock("a")}</div>
        <div className="grid gap-3">{driverBlock("b")}</div>
      </div>
      <p className="mt-3 text-xs text-muted" role="status">{pending ? "Loading comparison…" : "Selections are saved in the page URL so you can share them."}</p>
    </Card>
  );
}
