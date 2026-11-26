"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { GlobePin } from "@/components/globe";
import { Countdown, LocalClock, useNow, ZonedTime } from "@/components/clock";
import { TrophyIcon } from "@/components/icons";
import { fmt12 } from "@/lib/geo";

const Globe = dynamic(() => import("@/components/globe").then((m) => m.Globe), {
  ssr: false,
  loading: () => <div className="absolute inset-0 grid place-items-center"><div className="skeleton aspect-square h-[70%] !rounded-full" /></div>,
});

export interface HeroRace {
  round: number; name: string; circuitName: string; locality: string; country: string;
  lat: number; lng: number; tz: string; start: string; status: GlobePin["state"]; hasSprint: boolean;
  sessions: { id: string; label: string; start: string }[];
  podium: { code: string; name: string; colour: string }[];
}

const pad = (n: number) => String(n).padStart(2, "0");
const coord = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(2)}°${v >= 0 ? pos : neg}`;

export function SeasonHero({ season, races, live }: { season: number | null; races: HeroRace[]; live: boolean }) {
  const initial = races.find((r) => r.status === "live" || r.status === "next") ?? races.at(-1) ?? null;
  const [sel, setSel] = useState<number | null>(initial?.round ?? null);
  const [zone, setZone] = useState<"track" | "mine">("mine");
  const pins = useMemo<GlobePin[]>(() => races.map((r) => ({ id: String(r.round), lat: r.lat, lng: r.lng, state: r.status })), [races]);
  const race = races.find((r) => r.round === sel) ?? null;
  const now = useNow(1000);
  const nextSession = race && now ? race.sessions.find((s) => Date.parse(s.start) > now.getTime()) : null;
  const done = races.filter((r) => r.status === "completed");
  const ticker = done.filter((r) => r.podium[0]);

  return (
    <section aria-labelledby="hero-h" className="relative overflow-hidden border-b-2 border-border-strong">
      {/* survey grid + a slab of cobalt cutting the composition */}
      <div className="grid-bg pointer-events-none absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute -right-24 top-24 hidden h-[60%] w-[38%] -rotate-3 bg-cobalt/85 lg:block" aria-hidden />
      <div className="pointer-events-none absolute left-[38%] top-0 hidden h-full w-px bg-border lg:block" aria-hidden />

      <div className="relative mx-auto grid max-w-[1400px] gap-8 px-4 pb-8 pt-8 sm:px-6 lg:grid-cols-12 lg:pt-12">
        {/* raw headline, deliberately overlapping the globe frame */}
        <div className="pointer-events-none relative z-20 lg:col-span-7 lg:col-start-1 lg:row-start-1">
          <p className="stamp flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
            <span className={`inline-block h-2.5 w-2.5 ${live ? "bg-throttle" : "bg-accent"}`} aria-hidden />
            {season ? <>Season {season} <span className="text-subtle">/</span> {pad(done.length)} of {pad(races.length)} run</> : "Season calendar"}
          </p>
          <h1 id="hero-h" className="mt-4 uppercase leading-[0.86] tracking-[-0.045em] text-[clamp(2.75rem,8.5vw,7.25rem)]">
            <span className="stamp-in" style={{ ["--i" as string]: 0 }}>One planet</span>
            <span className="stamp-in pl-[8%] text-accent" style={{ ["--i" as string]: 1 }}>{races.length} circuits</span>
            <span className="stamp-in relative" style={{ ["--i" as string]: 2 }}>
              <span className="outline-text">Real sun</span>
              <span className="stamp absolute -top-1 right-0 hidden rotate-6 border-2 border-blood bg-blood px-2 py-1 text-[10px] text-bone sm:inline-block">Day/Night: live</span>
            </span>
          </h1>
          <p className="relative mt-5 inline-block max-w-md rotate-[-0.6deg] border-2 border-border-strong bg-bg px-4 py-3 text-[0.95rem] leading-relaxed text-muted shadow-[4px_4px_0_var(--color-cobalt)]">
            Every circuit pinned where the sun is right now. Pick one: local time, the weekend in your time, who won.
          </p>
        </div>

        {/* the globe, cropped hard into a concrete frame */}
        <div className="relative z-10 -mt-4 lg:col-span-7 lg:col-start-1 lg:row-start-1 lg:mt-[26rem] lg:-ml-6">
          <div className="relative h-[380px] overflow-hidden rounded-lg border-2 border-border-strong bg-[#121212] shadow-[8px_8px_0_var(--color-blood)] sm:h-[500px] lg:h-[560px]">
            <div className="absolute inset-0 -right-[18%] -top-[6%] bottom-[-14%]">
              <Globe pins={pins} focusId={sel != null ? String(sel) : null} onSelect={(id) => setSel(Number(id))} className="absolute inset-0 cursor-grab active:cursor-grabbing" />
            </div>
            <div className="mono pointer-events-none absolute bottom-0 left-0 hidden flex-wrap gap-x-4 border-r-2 border-t-2 border-border-strong bg-bg px-3 py-1.5 text-[11px] text-muted sm:flex" aria-hidden>
              {race ? <><span>{coord(race.lat, "N", "S")}</span><span>{coord(race.lng, "E", "W")}</span><span className="text-accent">{race.locality.toUpperCase()}</span></> : <span>WORLD</span>}
            </div>
            <div className="mono pointer-events-none absolute bottom-0 right-0 flex flex-wrap gap-x-3 border-l-2 border-t-2 border-border-strong bg-bg px-3 py-1.5 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 bg-accent" aria-hidden />NEXT</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 bg-bone" aria-hidden />DONE</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 bg-telemetry" aria-hidden />TO COME</span>
              <span className="hidden sm:inline">· DRAG TO SPIN</span>
            </div>
          </div>
        </div>

        {/* selected Grand Prix plate */}
        <div className="relative z-20 lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:mt-20">
          <AnimatePresence mode="wait">
            {race ? (
              <motion.article key={race.round} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative rounded-lg border-2 border-border-strong bg-surface p-5 shadow-[8px_8px_0_var(--color-cobalt)] lg:-rotate-1" aria-live="polite">
                <div className="flex items-start justify-between gap-3">
                  <span className="outline-text text-6xl leading-none" aria-hidden>{pad(race.round)}</span>
                  <StatusStamp status={race.status} />
                </div>
                <p className="stamp mt-2 text-subtle">Round {pad(race.round)}{race.hasSprint ? " · Sprint" : ""}</p>
                <h2 className="mt-1 text-2xl uppercase leading-[0.95]">{race.name}</h2>
                <p className="mono mt-1 text-xs text-muted">{race.circuitName} — {race.locality}, {race.country}</p>

                <div className="mt-4 grid grid-cols-2 border-2 border-border">
                  <div className="border-r-2 border-border p-3"><div className="stamp text-[10px] text-subtle">At the track</div><LocalClock tz={race.tz} lat={race.lat} lng={race.lng} className="mt-1 block text-sm" /></div>
                  <div className="p-3"><div className="stamp text-[10px] text-subtle">Your time</div>
                    <span className="num mt-1 block text-sm text-fg">{now ? fmt12(now, undefined, true) : " "}</span>
                    <span className="mono block truncate text-xs text-subtle">{now ? Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ") : ""}</span>
                  </div>
                </div>

                {race.podium.length > 0 ? (
                  <ol className="mt-4 grid grid-cols-3 border-2 border-border" aria-label="Podium">
                    {race.podium.map((d, i) => (
                      <li key={d.code} className={`p-2.5 text-center ${i < 2 ? "border-r-2 border-border" : ""} ${i === 0 ? "bg-accent text-bg" : ""}`}>
                        <div className="stamp text-[10px]">P{i + 1}</div>
                        <div className="mt-0.5 flex items-center justify-center gap-1.5 text-lg"><span className="h-3.5 w-1.5" style={{ background: d.colour }} aria-hidden />{d.code}</div>
                        <div className={`mono truncate text-[11px] ${i === 0 ? "text-bg" : "text-muted"}`}>{d.name.split(" ").slice(-1)}</div>
                      </li>
                    ))}
                  </ol>
                ) : nextSession ? (
                  <div className="mt-4">
                    <div className="stamp mb-2 text-[11px] text-muted">{nextSession.label} in</div>
                    <Countdown to={nextSession.start} compact />
                  </div>
                ) : null}

                {race.sessions.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="stamp text-[10px] text-subtle">Weekend</span>
                      <div className="flex border-2 border-border text-[11px]" role="group" aria-label="Time zone">
                        {(["mine", "track"] as const).map((z) => (
                          <button key={z} type="button" aria-pressed={zone === z} onClick={() => setZone(z)}
                            className={`stamp px-2 py-0.5 text-[10px] ${zone === z ? "bg-bone text-bg" : "text-muted hover:text-fg"}`}>{z === "mine" ? "My time" : "Track"}</button>
                        ))}
                      </div>
                    </div>
                    <ul className="text-sm">
                      {race.sessions.map((s) => {
                        const past = now ? Date.parse(s.start) < now.getTime() : false;
                        const isNext = nextSession?.id === s.id;
                        return (
                          <li key={s.id} className={`flex items-center justify-between border-b border-dashed border-border py-1.5 ${past ? "text-subtle line-through decoration-2" : ""} ${isNext ? "text-accent" : ""}`}>
                            <span className="flex items-center gap-2 uppercase text-xs">{isNext && <><span className="h-2 w-2 bg-accent" aria-hidden /><span className="sr-only">Next session:</span></>}{s.label}</span>
                            <span className="text-xs"><ZonedTime iso={s.start} tz={zone === "track" ? race.tz : undefined} /></span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                <Link href={`/gp/${race.round}${season ? `?season=${season}` : ""}`}
                  className="mt-5 flex w-full items-center justify-between rounded-lg border-2 border-bg bg-accent-fill px-4 py-3 text-sm uppercase text-bg shadow-[4px_4px_0_var(--color-blood)] transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--color-blood)] active:translate-y-px">
                  {race.locality} in 3D <ArrowIcon />
                </Link>
              </motion.article>
            ) : (
              <div className="plate p-5 text-sm text-muted">Season data is unavailable right now.</div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* results ticker */}
      {ticker.length > 0 && (
        <div className="relative overflow-hidden border-y-2 border-border-strong bg-bone py-2 text-bg" aria-label="Winners so far">
          <ul className="marquee flex w-max gap-8 whitespace-nowrap text-sm uppercase">
            {[...ticker, ...ticker].map((r, i) => (
              <li key={`${r.round}-${i}`} className="flex items-center gap-3" aria-hidden={i >= ticker.length || undefined}>
                <span className="mono text-xs font-bold">R{pad(r.round)}</span>{r.locality}
                <span className="h-2 w-2 bg-blood" aria-hidden /><span>{r.podium[0]!.code}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* round selector: the accessible way to move the globe */}
      {races.length > 0 && (
        <nav aria-label="Rounds" className="relative mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
          <ol className="flex gap-0 overflow-x-auto border-2 border-border [scrollbar-width:thin]">
            {races.map((r) => (
              <li key={r.round} className="shrink-0 border-r-2 border-border last:border-r-0">
                <button type="button" onClick={() => setSel(r.round)} aria-pressed={sel === r.round}
                  className={`flex min-w-[8rem] flex-col px-3 py-2 text-left transition-colors duration-200 ${sel === r.round ? "bg-accent text-bg" : "bg-surface hover:bg-elevated"}`}>
                  <span className={`mono flex items-center justify-between text-[11px] ${sel === r.round ? "text-bg" : "text-subtle"}`}>R{pad(r.round)}
                    <span className={`h-2 w-2 ${r.status === "completed" ? "bg-bone" : r.status === "upcoming" ? "bg-telemetry" : sel === r.round ? "bg-bg" : "bg-accent"}`} aria-hidden />
                  </span>
                  <span className="mt-0.5 text-sm uppercase">{r.locality}</span>
                  <span className={`mono inline-flex items-center gap-1 text-[11px] ${sel === r.round ? "text-bg" : "text-muted"}`}>
                    {r.podium[0] ? <><TrophyIcon className="h-3 w-3" />{r.podium[0].code}</> : new Date(r.start).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </section>
  );
}

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" aria-hidden><path d="M4 12h15M13 5l7 7-7 7" /></svg>
);

function StatusStamp({ status }: { status: GlobePin["state"] }) {
  const map = {
    live: ["bg-throttle text-bg", "Live weekend"],
    next: ["bg-accent text-bg", "Next race"],
    completed: ["border-2 border-border text-muted", "Completed"],
    upcoming: ["border-2 border-telemetry text-telemetry", "Upcoming"],
  } as const;
  const [c, l] = map[status];
  return <span className={`stamp rotate-2 px-2 py-1 text-[10px] ${c}`}>{l}</span>;
}
