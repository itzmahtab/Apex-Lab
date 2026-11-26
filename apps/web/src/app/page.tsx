import { Suspense } from "react";
import Link from "next/link";
import { Container } from "@/components/site";
import { FeaturedGrid } from "@/components/featured";
import { LinkButton } from "@/components/ui/button";
import { SeasonHero, type HeroRace } from "@/components/season-hero";
import { CalendarGrid, ConstructorStandings, DriverStandings, LastRace, NextRace, SectionHead } from "@/components/season-sections";
import { PointsChart } from "@/components/points-chart";
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
          <div className="rounded-2xl border border-border bg-surface/70 p-6 text-sm text-muted" role="status">
            Live season data (calendar, results and standings) is unavailable right now. The globe still shows local time at every circuit.
          </div>
        </Container>
      </>
    );
  }
  return (
    <>
      <SeasonHero season={s.season} races={s.races.map(toHero)} live />
      <Container className="space-y-16 pt-10">
        {s.nextRace && <NextRace race={s.nextRace} />}
        {s.lastRace && <LastRace race={s.lastRace} />}

        {(s.drivers.length > 0 || s.constructors.length > 0) && (
          <section aria-labelledby="standings-h">
            <SectionHead id="standings-h" kicker="Championship" title={`${s.season} standings`} />
            <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
              {s.drivers.length > 0 && <DriverStandings rows={s.drivers} round={s.standingsRound} />}
              <div className="space-y-5">
                {s.constructors.length > 0 && <ConstructorStandings rows={s.constructors} />}
              </div>
            </div>
          </section>
        )}

        {s.progression && (
          <section aria-labelledby="prog-h" className="rounded-2xl border border-border bg-surface/80 p-4 sm:p-6">
            <SectionHead id="prog-h" kicker="Title fight" title="Points, round by round" />
            <PointsChart data={s.progression} />
            <p className="mt-3 text-xs text-subtle">Race and sprint points as awarded, summed per round. Teammates are dashed.</p>
          </section>
        )}

        <section aria-labelledby="cal-h">
          <SectionHead id="cal-h" kicker="Calendar" title={`All ${s.races.length} rounds`} action={<Link href="/events" className="hidden text-sm text-muted hover:text-fg sm:block">Telemetry by event →</Link>} />
          <CalendarGrid races={s.races} />
        </section>
      </Container>
    </>
  );
}

function HubSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_400px]" aria-busy="true">
      <h1 className="sr-only">Loading the season</h1>
      <div className="grid place-items-center"><div className="skeleton aspect-square w-[min(80vw,560px)] rounded-full" /></div>
      <SkeletonCard h="h-[520px]" />
    </div>
  );
}

export default function Home() {
  return (
    <main id="main" className="flex-1">
      <Suspense fallback={<HubSkeleton />}><SeasonHub /></Suspense>

      <Container className="space-y-16 pt-16">
        <section aria-labelledby="tools-h" className="grid gap-4 md:grid-cols-2">
          <h2 id="tools-h" className="sr-only">Tools</h2>
          <Link href="/live" className="group relative overflow-hidden rounded-2xl border border-border bg-surface/80 p-6 transition-colors hover:border-border-strong">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-throttle/10 blur-2xl" aria-hidden />
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-throttle"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-throttle" aria-hidden />Live timing</span>
            <h3 className="mt-2 text-xl font-semibold">Session dashboard</h3>
            <p className="mt-1 text-sm text-muted">Positions, gaps, sectors, tyres, race control and weather, refreshed every few seconds during a session.</p>
            <span className="mt-4 inline-block text-sm font-medium text-muted group-hover:text-fg">Open the dashboard →</span>
          </Link>
          <Link href="/compare" className="group relative overflow-hidden rounded-2xl border border-border bg-surface/80 p-6 transition-colors hover:border-border-strong">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-2xl" aria-hidden />
            <span className="text-xs uppercase tracking-[0.14em] text-accent">Telemetry lab</span>
            <h3 className="mt-2 text-xl font-semibold">Find where the lap was won</h3>
            <p className="mt-1 text-sm text-muted">Compare any two laps from 2023 onwards: sector gaps, a track dominance map and synced speed, throttle and brake traces.</p>
            <span className="mt-4 inline-block text-sm font-medium text-muted group-hover:text-fg">Compare laps →</span>
          </Link>
        </section>

        <section aria-labelledby="featured-h">
          <SectionHead id="featured-h" kicker="Featured comparisons" title="Laps worth a second look"
            action={<LinkButton href="/compare" className="hidden sm:inline-flex">Build your own</LinkButton>} />
          <FeaturedGrid />
        </section>

        <p className="text-xs text-subtle">
          Calendar, classifications and standings from <a className="underline underline-offset-4 hover:text-fg" href="https://jolpi.ca" rel="noopener noreferrer">Jolpica</a> (the community successor to Ergast); practice results, team colours and circuit geometry from OpenF1. Unofficial and not affiliated with Formula 1.
        </p>
      </Container>
    </main>
  );
}
