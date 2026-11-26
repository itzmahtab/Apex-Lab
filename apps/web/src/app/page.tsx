import { Suspense } from "react";
import Link from "next/link";
import { Container } from "@/components/site";
import { FeaturedGrid } from "@/components/featured";
import { LinkButton } from "@/components/ui/button";
import { SeasonHero, type HeroRace } from "@/components/season-hero";
import { CalendarGrid, ConstructorStandings, DriverStandings, LastRace, NextRace, SectionHead, SectionLink } from "@/components/season-sections";
import { ArrowRightIcon, PulseIcon } from "@/components/icons";
import { PointsChart } from "@/components/points-chart";
import { CarShowroom } from "@/components/car-showroom";
import { Reveal } from "@/components/reveal";
import { SkeletonCard } from "@/components/states";
import { CIRCUITS } from "@/lib/circuits";
import { getSeason, type Race } from "@/server/season";

export const dynamic = "force-dynamic";

const toHero = (r: Race): HeroRace => ({
  round: r.round, name: r.name, circuitName: r.circuitName, locality: r.locality, country: r.country,
  lat: r.lat, lng: r.lng, tz: r.tz, start: r.start, status: r.status, hasSprint: r.hasSprint, sessions: r.sessions,
  podium: r.podium.map((d) => ({ code: d.code, name: d.name, colour: d.colour })),
});

/** Offline / upstream-down fallback: the globe still shows every circuit and its local time. */
const STATIC_HERO: HeroRace[] = Object.entries(CIRCUITS).map(([id, c], i) => ({
  round: i + 1, name: `${c.locality}`, circuitName: id.replace(/_/g, " "), locality: c.locality, country: c.country,
  lat: c.lat, lng: c.lng, tz: c.tz, start: new Date(0).toISOString(), status: "upcoming", hasSprint: false, sessions: [], podium: [],
}));

async function SeasonHub() {
  const s = await getSeason();
  if (!s) {
    return (
      <>
        <SeasonHero season={null} races={STATIC_HERO} live={false} />
        <Container className="pt-10">
          <div className="rounded-lg border-2 border-dashed border-border bg-surface p-6 text-sm text-muted" role="status">
            Live season data (calendar, results and standings) is unavailable right now. The globe still shows local time at every circuit.
          </div>
        </Container>
      </>
    );
  }
  return (
    <>
      <SeasonHero season={s.season} races={s.races.map(toHero)} live />
      <Container className="space-y-[clamp(4rem,8vw,8rem)] pt-[clamp(3rem,6vw,6rem)]">
        {s.nextRace && <Reveal><NextRace race={s.nextRace} /></Reveal>}
        {s.lastRace && <Reveal className="lg:w-[88%]"><LastRace race={s.lastRace} /></Reveal>}

        {(s.drivers.length > 0 || s.constructors.length > 0) && (
          <Reveal><section aria-labelledby="standings-h">
            <SectionHead id="standings-h" index="03" kicker="Championship" title={`${s.season} standings`} />
            <div className="grid gap-8 lg:grid-cols-12">
              {s.drivers.length > 0 && <div className="lg:col-span-7"><DriverStandings rows={s.drivers} round={s.standingsRound} /></div>}
              {s.constructors.length > 0 && <div className="lg:col-span-5 lg:mt-20"><ConstructorStandings rows={s.constructors} /></div>}
            </div>
          </section></Reveal>
        )}

        {s.constructors.length > 0 && s.drivers.length > 0 && (
          <Reveal><section aria-labelledby="grid-h">
            <SectionHead id="grid-h" index="04" kicker="The grid" title="Cars & drivers" />
            <CarShowroom
              teams={s.constructors.map((t) => ({ teamId: t.teamId, name: t.name, colour: t.colour, position: t.position, points: t.points }))}
              drivers={s.drivers.map((d) => ({ id: d.id, code: d.code, name: d.name, number: d.number, teamId: d.teamId, team: d.team, colour: d.colour, position: d.position, points: d.points, wins: d.wins, nationality: d.nationality }))} />
          </section></Reveal>
        )}

        {s.progression && (
          <Reveal><section aria-labelledby="prog-h" className="lg:ml-[8%]">
            <SectionHead id="prog-h" index="05" kicker="Title fight" title="Points, round by round" />
            <div className="rounded-lg border-2 border-border-strong bg-surface p-4 shadow-[8px_8px_0_var(--color-blood)] sm:p-6">
              <PointsChart data={s.progression} />
              <p className="mono mt-3 text-xs text-subtle">RACE + SPRINT POINTS AS AWARDED, SUMMED PER ROUND. TEAMMATES DASHED.</p>
            </div>
          </section></Reveal>
        )}

        <Reveal><section aria-labelledby="cal-h">
          <SectionHead id="cal-h" index="06" kicker="Calendar" title={`All ${s.races.length} rounds`} action={<SectionLink href="/events">Telemetry by event</SectionLink>} />
          <CalendarGrid races={s.races} />
        </section></Reveal>
      </Container>
    </>
  );
}

function HubSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-10 sm:px-6 lg:grid-cols-12" aria-busy="true">
      <h1 className="sr-only">Loading the season</h1>
      <div className="skeleton h-[520px] lg:col-span-7" />
      <SkeletonCard h="h-[520px] lg:col-span-5" />
    </div>
  );
}

export default function Home() {
  return (
    <main id="main" className="flex-1">
      <Suspense fallback={<HubSkeleton />}><SeasonHub /></Suspense>

      <Container className="space-y-[clamp(4rem,8vw,8rem)] pt-[clamp(4rem,8vw,8rem)]">
        {/* zig-zag tools: two unequal slabs, offset against each other */}
        <Reveal><section aria-labelledby="tools-h" className="grid gap-6 md:grid-cols-12">
          <h2 id="tools-h" className="sr-only">Tools</h2>
          <Link href="/live" className="distort relative overflow-hidden rounded-lg border-2 border-border-strong bg-cobalt p-6 text-bone shadow-[6px_6px_0_var(--color-blood)] md:col-span-7 sm:p-8">
            <svg className="pointer-events-none absolute -bottom-6 -right-4 h-40 w-[26rem]" viewBox="0 0 420 160" aria-hidden><text x="420" y="150" textAnchor="end" fontFamily="var(--font-display)" fontSize="150" fill="rgba(255,255,255,0.1)">LIVE</text></svg>
            <span className="stamp inline-flex items-center gap-2 text-[11px]"><PulseIcon className="h-4 w-4" />Live timing</span>
            <h3 className="mt-3 text-[clamp(1.6rem,3vw,2.4rem)] uppercase leading-[0.95]">Session dashboard</h3>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-bone/85">Positions, gaps, sectors, tyres, race control and weather, refreshed every few seconds while cars are running.</p>
            <span className="stamp mt-6 inline-flex items-center gap-2 border-2 border-bone px-3 py-2 text-[11px]">Open dashboard<ArrowRightIcon className="h-3.5 w-3.5" /></span>
          </Link>
          <Link href="/compare" className="distort relative overflow-hidden rounded-lg border-2 border-border-strong bg-surface p-6 shadow-[6px_6px_0_var(--color-cobalt)] md:col-span-5 md:mt-16 sm:p-8">
            <span className="stamp text-[11px] text-accent">Telemetry lab</span>
            <h3 className="mt-3 text-[clamp(1.4rem,2.4vw,2rem)] uppercase leading-[0.95]">Find where the lap was won</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">Any two laps since 2023: sector gaps, a track dominance map, synced speed, throttle and brake traces.</p>
            <span className="stamp mt-6 inline-flex items-center gap-2 border-2 border-border-strong px-3 py-2 text-[11px]">Compare laps<ArrowRightIcon className="h-3.5 w-3.5" /></span>
          </Link>
        </section></Reveal>

        <Reveal><section aria-labelledby="featured-h">
          <SectionHead id="featured-h" index="07" kicker="Featured comparisons" title="Laps worth a second look"
            action={<LinkButton href="/compare" variant="primary" className="hidden sm:inline-flex">Build your own</LinkButton>} />
          <FeaturedGrid />
        </section></Reveal>

        <p className="mono max-w-3xl text-xs text-subtle">
          CALENDAR, CLASSIFICATIONS, STANDINGS: <a className="underline underline-offset-4 hover:text-fg" href="https://jolpi.ca" rel="noopener noreferrer">JOLPICA</a> (ERGAST SUCCESSOR). PRACTICE RESULTS, TEAM COLOURS, CIRCUIT GEOMETRY: OPENF1. UNOFFICIAL; NOT AFFILIATED WITH FORMULA 1.
        </p>
      </Container>
    </main>
  );
}
