"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { LiveSnapshot } from "@/server/live";

const TYRE: Record<string, { c: string; l: string }> = {
  SOFT: { c: "#FF453A", l: "S" }, MEDIUM: { c: "#F6C453", l: "M" }, HARD: { c: "#F4F6F8", l: "H" },
  INTERMEDIATE: { c: "#67D5A5", l: "I" }, WET: { c: "#56B4E9", l: "W" },
};
const FLAG: Record<string, string> = { GREEN: "#67D5A5", YELLOW: "#F6C453", "DOUBLE YELLOW": "#F6C453", RED: "#FF453A", BLUE: "#56B4E9", CHEQUERED: "#F4F6F8", CLEAR: "#67D5A5", BLACK: "#9aa4b2" };

function Tyre({ t }: { t: NonNullable<LiveSnapshot["rows"][number]["tyre"]> }) {
  const m = TYRE[t.compound] ?? { c: "#6b7484", l: "?" };
  return (
    <span className="inline-flex items-center gap-1.5" title={`${t.compound.toLowerCase()}${t.laps != null ? `, ${t.laps} laps old` : ""}${t.fresh ? ", new set" : ""}`}>
      <span className="grid h-5 w-5 place-items-center rounded-full border-2 text-[10px] font-bold" style={{ borderColor: m.c, color: m.c }}>{m.l}</span>
      {t.laps != null && <span className="text-xs text-muted num">{t.laps}</span>}
      <span className="sr-only">{t.compound.toLowerCase()} tyre</span>
    </span>
  );
}

export function LiveDashboard({ initial }: { initial: LiveSnapshot | null }) {
  const [snap, setSnap] = useState(initial);
  const [error, setError] = useState<string | null>(initial ? null : "No timing data is available right now.");
  const [updated, setUpdated] = useState<number | null>(null);
  const live = snap?.mode === "live";

  useEffect(() => {
    setUpdated(Date.now());
    let stop = false, timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const r = await fetch("/api/live", { cache: "no-store" });
        if (!r.ok) throw new Error();
        const s = (await r.json()) as LiveSnapshot;
        if (!stop) { setSnap(s); setError(null); setUpdated(Date.now()); }
      } catch { if (!stop) setError("Couldn't refresh. Retrying…"); }
      if (!stop && !document.hidden) timer = setTimeout(tick, live ? 3000 : 60000);
    };
    timer = setTimeout(tick, live ? 3000 : 60000);
    const onVis = () => { if (!document.hidden) { clearTimeout(timer); tick(); } };
    document.addEventListener("visibilitychange", onVis);
    return () => { stop = true; clearTimeout(timer); document.removeEventListener("visibilitychange", onVis); };
  }, [live]);

  if (!snap) {
    return <div className="rounded-2xl border border-border bg-surface/80 p-10 text-center text-muted" role="status">{error}</div>;
  }
  const isRace = /race|sprint/i.test(snap.session.type) && !/qualifying/i.test(snap.session.name);
  const lapPct = snap.lap?.total ? Math.min(100, (snap.lap.current / snap.lap.total) * 100) : null;
  const hasBest = snap.rows.some((r) => r.best);
  const flag = snap.raceControl.find((m) => m.flag)?.flag?.toUpperCase() ?? null;

  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden rounded-2xl border border-border bg-surface/80 p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1" style={{ background: flag ? FLAG[flag] ?? "#313847" : live ? "#67D5A5" : "#313847" }} aria-hidden />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.14em]">
              {live ? <><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-throttle opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-throttle" /></span><span className="text-throttle">Live</span></>
                : <><span className="h-2 w-2 rounded-full bg-warn" aria-hidden /><span className="text-warn">Not live · latest session</span></>}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{snap.session.meeting}</h1>
            <p className="text-muted">{snap.session.name}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            {snap.lap && (
              <div className="min-w-36 rounded-xl border border-border bg-bg/60 px-4 py-2.5">
                <div className="text-[10px] uppercase tracking-[0.14em] text-subtle">Lap</div>
                <div className="num text-2xl font-semibold">{snap.lap.current}{snap.lap.total ? <span className="text-muted">/{snap.lap.total}</span> : null}</div>
                {lapPct != null && <div className="mt-1 h-1 overflow-hidden rounded-full bg-elevated"><motion.div className="h-full bg-accent" initial={false} animate={{ width: `${lapPct}%` }} /></div>}
              </div>
            )}
            {flag && (
              <div className="rounded-xl border border-border bg-bg/60 px-4 py-2.5">
                <div className="text-[10px] uppercase tracking-[0.14em] text-subtle">Track</div>
                <div className="flex items-center gap-2 text-lg font-semibold"><span className="h-3 w-3 rounded-sm" style={{ background: FLAG[flag] ?? "#9aa4b2" }} aria-hidden />{flag.toLowerCase()}</div>
              </div>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-subtle" aria-live="polite">
          {snap.source}{updated ? ` · updated ${new Date(updated).toLocaleTimeString("en-GB")}` : ""}{live ? " · refreshes every 3 s" : ""}{error ? ` · ${error}` : ""}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="tower-h" className="rounded-2xl border border-border bg-surface/80 p-3 sm:p-5">
          <h2 id="tower-h" className="mb-3 px-1 text-sm font-medium uppercase tracking-[0.12em] text-muted">Timing</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <caption className="sr-only">Timing tower</caption>
              <thead><tr className="text-left text-xs text-subtle">
                <th scope="col" className="pb-2 pl-1 font-normal">Pos</th><th scope="col" className="pb-2 font-normal">Driver</th>
                <th scope="col" className="pb-2 text-right font-normal">{isRace ? "Gap" : "Gap to P1"}</th>
                {live && <th scope="col" className="pb-2 text-right font-normal">Int</th>}
                {hasBest && <th scope="col" className="pb-2 text-right font-normal">Best</th>}
                {live && <th scope="col" className="hidden pb-2 text-right font-normal md:table-cell">Sectors</th>}
                <th scope="col" className="pb-2 pl-4 font-normal">Tyre</th>
                <th scope="col" className="pb-2 pr-1 text-right font-normal">Pits</th>
              </tr></thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {snap.rows.map((r) => (
                    <motion.tr key={r.number} layout transition={{ type: "spring", stiffness: 500, damping: 40 }} className={`border-t border-border/70 ${r.retired ? "opacity-45" : ""}`}>
                      <td className="py-2 pl-1 num text-subtle">{r.retired ? "OUT" : r.position ?? "—"}</td>
                      <td className="py-2">
                        <span className="flex items-center gap-2">
                          <span className="h-5 w-1 shrink-0 rounded-full" style={{ background: r.colour }} aria-hidden />
                          <b className="num">{r.code}</b>
                          <span className="hidden truncate text-muted lg:inline">{r.team}</span>
                          {r.inPit && <span className="rounded border border-warn/40 bg-warn/10 px-1 text-[10px] text-warn">PIT</span>}
                        </span>
                      </td>
                      <td className="py-2 text-right num">{r.gap}</td>
                      {live && <td className="py-2 text-right num text-muted">{r.interval}</td>}
                      {hasBest && <td className={`py-2 text-right num ${r.bestIsOverall ? "text-purple" : ""}`}>{r.best}{r.bestIsOverall && <span className="sr-only"> (fastest)</span>}</td>}
                      {live && (
                        <td className="hidden py-2 text-right md:table-cell">
                          <span className="inline-flex gap-1">
                            {r.sectors.slice(0, 3).map((s, i) => (
                              <span key={i} className={`min-w-12 rounded px-1 text-xs num ${s.overall ? "bg-purple/20 text-purple" : s.personal ? "bg-throttle/15 text-throttle" : "text-muted"}`}>{s.value || "—"}</span>
                            ))}
                          </span>
                        </td>
                      )}
                      <td className="py-2 pl-4">{r.tyre ? <Tyre t={r.tyre} /> : <span className="text-subtle">—</span>}</td>
                      <td className="py-2 pr-1 text-right num text-muted">{r.pits ?? "—"}</td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          {snap.rows.length === 0 && <p className="py-8 text-center text-muted">No timing yet for this session.</p>}
        </section>

        <aside className="space-y-5">
          {snap.weather && (
            <section aria-labelledby="wx-h" className="rounded-2xl border border-border bg-surface/80 p-5">
              <h2 id="wx-h" className="text-sm font-medium uppercase tracking-[0.12em] text-muted">Weather</h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                {([["Air", snap.weather.air, "°C"], ["Track", snap.weather.track, "°C"], ["Humidity", snap.weather.humidity, "%"], ["Wind", snap.weather.wind, " m/s"]] as const).map(([l, v, u]) => (
                  <div key={l} className="rounded-xl border border-border bg-bg/60 p-3"><dt className="text-[10px] uppercase tracking-[0.14em] text-subtle">{l}</dt><dd className="num text-xl font-semibold">{v == null ? "—" : `${v}${u}`}</dd></div>
                ))}
              </dl>
              <p className="mt-3 text-sm">{snap.weather.rain ? <span className="text-telemetry">Rain reported</span> : <span className="text-muted">Dry</span>}</p>
            </section>
          )}
          <section aria-labelledby="rc-h" className="rounded-2xl border border-border bg-surface/80 p-5">
            <h2 id="rc-h" className="text-sm font-medium uppercase tracking-[0.12em] text-muted">Race control</h2>
            {snap.raceControl.length === 0 ? <p className="mt-3 text-sm text-muted">No messages.</p> : (
              <ol className="mt-3 max-h-[560px] space-y-2 overflow-y-auto pr-1 text-sm" tabIndex={0} aria-label="Race control messages, newest first">
                {snap.raceControl.map((m, i) => (
                  <li key={`${m.time}-${i}`} className="rounded-xl border border-border bg-bg/60 p-3">
                    <div className="flex items-center justify-between text-[11px] text-subtle">
                      <span className="flex items-center gap-1.5">{m.flag && <span className="h-2.5 w-2.5 rounded-sm" style={{ background: FLAG[m.flag.toUpperCase()] ?? "#9aa4b2" }} aria-hidden />}{m.category}{m.lap ? ` · lap ${m.lap}` : ""}</span>
                      {m.time && <span className="num">{new Date(m.time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>}
                    </div>
                    <p className="mt-1 leading-snug">{m.message}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
