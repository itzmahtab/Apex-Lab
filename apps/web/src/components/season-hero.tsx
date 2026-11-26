"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GlobePin } from "@/components/globe";
import { Countdown, LocalClock, useNow, ZonedTime } from "@/components/clock";

const Globe = dynamic(() => import("@/components/globe").then((m) => m.Globe), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center"><div className="h-[62%] aspect-square rounded-full border border-border/60 bg-[radial-gradient(circle_at_35%_30%,#16202e,#08090c_70%)]" /></div>,
});

export interface HeroRace {
  round: number; name: string; circuitName: string; locality: string; country: string;
  lat: number; lng: number; tz: string; start: string; status: GlobePin["state"]; hasSprint: boolean;
  sessions: { id: string; label: string; start: string }[];
  podium: { code: string; name: string; colour: string }[];
}

export function SeasonHero({ season, races, live }: { season: number | null; races: HeroRace[]; live: boolean }) {
  const initial = races.find((r) => r.status === "live" || r.status === "next") ?? races.at(-1) ?? null;
  const [sel, setSel] = useState<number | null>(initial?.round ?? null);
  const [zone, setZone] = useState<"track" | "mine">("mine");
  const pins = useMemo<GlobePin[]>(() => races.map((r) => ({ id: String(r.round), lat: r.lat, lng: r.lng, state: r.status })), [races]);
  const race = races.find((r) => r.round === sel) ?? null;
  const now = useNow(1000);
  const nextSession = race && now ? race.sessions.find((s) => Date.parse(s.start) > now.getTime()) : null;
  const completedCount = races.filter((r) => r.status === "completed").length;

  return (
    <section aria-labelledby="hero-h" className="relative overflow-hidden border-b border-border/70">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" aria-hidden />
      <div className="relative mx-auto grid max-w-[1400px] gap-6 px-4 pt-8 pb-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:pt-10">
        <div className="relative">
          <div className="relative z-10 max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 text-xs text-muted backdrop-blur">
              <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-throttle" : "bg-warn"}`} aria-hidden />
              {season ? `${season} season · ${completedCount} of ${races.length} rounds run` : "Season calendar"}
            </p>
            <h1 id="hero-h" className="mt-4 text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl">
              The whole season,<br /><span className="bg-gradient-to-r from-accent via-[#ff7a45] to-warn bg-clip-text text-transparent">one live planet.</span>
            </h1>
            <p className="mt-3 max-w-md text-muted">
              Every circuit, lit by the sun where it is right now. Pick a pin for its local time, its weekend schedule and who won.
            </p>
          </div>
          <div className="relative -mt-6 h-[380px] sm:h-[520px] lg:-mt-24 lg:h-[640px]">
            <Globe pins={pins} focusId={sel != null ? String(sel) : null} onSelect={(id) => setSel(Number(id))} className="absolute inset-0 cursor-grab active:cursor-grabbing" />
            <div className="pointer-events-none absolute bottom-3 left-0 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" />Next / live</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-fg" />Completed</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-telemetry" />Upcoming</span>
              <span className="hidden sm:inline">Drag to spin · lit by the real sun</span>
            </div>
          </div>
        </div>

        {/* selected Grand Prix */}
        <div className="relative z-10 flex flex-col gap-4 lg:pt-6">
          <AnimatePresence mode="wait">
            {race ? (
              <motion.article key={race.round} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
                className="rounded-2xl border border-border bg-surface/85 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl" aria-live="polite">
                <div className="flex items-center justify-between text-xs text-subtle">
                  <span className="num">ROUND {String(race.round).padStart(2, "0")}{race.hasSprint ? " · SPRINT" : ""}</span>
                  <StatusBadge status={race.status} />
                </div>
                <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight">{race.name}</h2>
                <p className="text-sm text-muted">{race.circuitName} · {race.locality}, {race.country}</p>

                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-border bg-bg/60 p-3 text-sm">
                  <div><div className="text-[10px] uppercase tracking-[0.14em] text-subtle">At the track</div><LocalClock tz={race.tz} lat={race.lat} lng={race.lng} className="mt-1 block" /></div>
                  <div><div className="text-[10px] uppercase tracking-[0.14em] text-subtle">Your time</div>
                    <span className="mt-1 block num text-fg">{now ? now.toLocaleTimeString("en-GB") : " "}</span>
                    <span className="block text-xs text-subtle">{now ? Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ") : ""}</span>
                  </div>
                </div>

                {race.podium.length > 0 ? (
                  <ol className="mt-4 grid grid-cols-3 gap-2" aria-label="Podium">
                    {race.podium.map((d, i) => (
                      <li key={d.code} className={`rounded-xl border border-border bg-bg/60 p-2.5 text-center ${i === 0 ? "ring-1 ring-warn/50" : ""}`}>
                        <div className="text-[10px] uppercase tracking-[0.14em] text-subtle">P{i + 1}</div>
                        <div className="mt-0.5 flex items-center justify-center gap-1.5 font-semibold num"><span className="h-3 w-1 rounded-full" style={{ background: d.colour }} aria-hidden />{d.code}</div>
                        <div className="truncate text-xs text-muted">{d.name.split(" ").slice(-1)}</div>
                      </li>
                    ))}
                  </ol>
                ) : nextSession ? (
                  <div className="mt-4">
                    <div className="mb-2 text-xs text-muted">{nextSession.label} starts in</div>
                    <Countdown to={nextSession.start} compact />
                  </div>
                ) : null}

                {race.sessions.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.14em] text-subtle">Weekend schedule</span>
                      <div className="flex rounded-lg border border-border p-0.5 text-xs" role="group" aria-label="Time zone">
                        {(["mine", "track"] as const).map((z) => (
                          <button key={z} type="button" aria-pressed={zone === z} onClick={() => setZone(z)}
                            className={`rounded-md px-2 py-0.5 ${zone === z ? "bg-elevated text-fg" : "text-muted hover:text-fg"}`}>{z === "mine" ? "My time" : "Track time"}</button>
                        ))}
                      </div>
                    </div>
                    <ul className="divide-y divide-border/70 text-sm">
                      {race.sessions.map((s) => {
                        const past = now ? Date.parse(s.start) < now.getTime() : false;
                        const isNext = nextSession?.id === s.id;
                        return (
                          <li key={s.id} className={`flex items-center justify-between py-1.5 ${past ? "text-subtle" : ""}`}>
                            <span className="flex items-center gap-2">{isNext && <><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden /><span className="sr-only">Next session:</span></>}{s.label}</span>
                            <ZonedTime iso={s.start} tz={zone === "track" ? race.tz : undefined} />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                <Link href={`/gp/${race.round}${season ? `?season=${season}` : ""}`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-fill px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#c4271b]">
                  Open {race.locality} in 3D <span aria-hidden>→</span>
                </Link>
              </motion.article>
            ) : (
              <div className="rounded-2xl border border-border bg-surface/85 p-5 text-sm text-muted">Season data is unavailable right now.</div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* round selector: the accessible way to move the globe */}
      {races.length > 0 && (
        <nav aria-label="Rounds" className="relative mx-auto max-w-[1400px] px-4 pb-6 sm:px-6">
          <ol className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {races.map((r) => (
              <li key={r.round} className="shrink-0">
                <button type="button" onClick={() => setSel(r.round)} aria-pressed={sel === r.round}
                  className={`flex min-w-[7.5rem] flex-col rounded-xl border px-3 py-2 text-left text-xs transition-colors ${sel === r.round ? "border-accent/70 bg-accent/10" : "border-border bg-surface/70 hover:border-border-strong"}`}>
                  <span className="flex items-center justify-between text-subtle num">R{String(r.round).padStart(2, "0")}
                    <span className={`h-1.5 w-1.5 rounded-full ${r.status === "completed" ? "bg-fg" : r.status === "upcoming" ? "bg-telemetry" : "bg-accent"}`} aria-hidden />
                  </span>
                  <span className="mt-0.5 font-medium text-fg">{r.locality}</span>
                  <span className="text-muted">{r.podium[0] ? `🏆 ${r.podium[0].code}` : new Date(r.start).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: GlobePin["state"] }) {
  const map = {
    live: ["border-throttle/40 bg-throttle/10 text-throttle", "Live weekend"],
    next: ["border-accent/40 bg-accent/10 text-accent", "Next race"],
    completed: ["border-border bg-elevated text-muted", "Completed"],
    upcoming: ["border-telemetry/40 bg-telemetry/10 text-telemetry", "Upcoming"],
  } as const;
  const [c, l] = map[status];
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${c}`}>{l}</span>;
}
