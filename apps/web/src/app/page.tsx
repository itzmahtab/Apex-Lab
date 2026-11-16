import { Suspense } from "react";
import Link from "next/link";
import { formatDelta, formatLapTime } from "@apexlab/analytics";
import { Badge, Card, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { PageContainer } from "@/components/site";
import { SpeedSparkline } from "@/components/charts";
import { TrackMap } from "@/components/track-map";
import { FeaturedGrid } from "@/components/featured";
import { LineKey } from "@/components/driver";
import { SkeletonCard } from "@/components/states";
import { buildComparison, completeSelection, FEATURED, loadSession, toQueryString } from "@/server/comparison";
import { getRepository } from "@/server/repository";
import { pairColours } from "@/lib/colors";

export const dynamic = "force-dynamic";

async function HeroComparison() {
  const f = FEATURED[0];
  try {
    const s = await loadSession(f.session);
    const q = completeSelection(s, { a: f.a, b: f.b });
    if (!q) return null;
    const c = await buildComparison(q);
    const colours = pairColours(c.a.teamColour, c.b.teamColour);
    return (
      <Link href={`/compare?${toQueryString(q)}`} className="group block rounded-2xl border border-border bg-surface/80 p-5 transition-colors hover:border-border-strong sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-muted">{c.session.eventName} {c.session.season} · {c.session.name}</span>
          <Badge tone="live">Real telemetry</Badge>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <div><div className="flex items-center gap-2 text-2xl font-bold num" style={{ color: colours.a }}><LineKey colour={colours.a} />{c.a.abbreviation}</div><div className="text-xl num">{formatLapTime(c.a.lapTimeMs)}</div></div>
          <div className="pb-1 text-center"><div className="text-xs uppercase tracking-[0.14em] text-muted">Gap</div><div className="text-2xl font-bold num">{formatDelta(c.lapDeltaMs)}</div></div>
          <div className="text-right"><div className="flex items-center justify-end gap-2 text-2xl font-bold num" style={{ color: colours.b }}>{c.b.abbreviation}<LineKey colour={colours.b} dashed /></div><div className="text-xl num">{formatLapTime(c.b.lapTimeMs)}</div></div>
        </div>
        {c.track && <div className="mt-4"><TrackMap track={c.track} sectors={c.miniSectors} colours={colours} labels={{ a: c.a.abbreviation, b: c.b.abbreviation }} compact /></div>}
        <div className="mt-2"><SpeedSparkline data={c.points} colours={colours} height={90} /></div>
        <div className="mt-3 text-sm font-medium text-muted group-hover:text-fg">Open the full comparison →</div>
      </Link>
    );
  } catch {
    return (
      <Card className="flex min-h-80 flex-col items-center justify-center text-center">
        <p className="font-semibold">Live data is taking a breather</p>
        <p className="mt-1 max-w-sm text-sm text-muted">OpenF1 didn&apos;t respond in time. The rest of the site still works. Try a featured comparison below.</p>
      </Card>
    );
  }
}

async function LatestSession() {
  const s = await getRepository().latestSession("Qualifying").catch(() => null);
  if (!s) return null;
  const ev = await getRepository().getEvent(s.eventKey).catch(() => null);
  return (
    <Link href={`/compare?session=${s.key}`} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1.5 text-sm text-muted transition-colors hover:border-border-strong hover:text-fg">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
      Latest: {ev?.event.name ?? "Qualifying"} {ev?.event.year} qualifying <span aria-hidden>→</span>
    </Link>
  );
}

const STEPS = [
  { n: "01", t: "Pick a session", d: "Any Grand Prix weekend from 2023 onwards: practice, sprint, qualifying or race." },
  { n: "02", t: "Pick two laps", d: "We pre-select the two fastest drivers and their best laps. Change anything." },
  { n: "03", t: "See the difference", d: "Sector gaps, a track dominance map and synced speed, throttle, brake and gear traces." },
  { n: "04", t: "Share it", d: "The URL is the comparison. Every link gets its own social card." },
];

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0" aria-hidden />
        <PageContainer className="relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <Suspense fallback={<div className="h-8" />}><LatestSession /></Suspense>
            <h1 className="mt-5 text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Find where the<br />lap was <span className="bg-gradient-to-r from-accent to-[#ff8a3d] bg-clip-text text-transparent">won.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Compare any two Formula 1 laps from real timing and telemetry. See which corners decided it, where the throttle went down earlier, and share the answer with one link.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <LinkButton href="/compare" variant="primary" className="min-h-12 px-6 text-base">Compare laps</LinkButton>
              <LinkButton href="/events" className="min-h-12 px-6 text-base">Browse the calendar</LinkButton>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
              {[["2023+", "seasons"], ["~3.7 Hz", "telemetry"], ["24", "mini-sectors"]].map(([v, l]) => (
                <div key={l}><dt className="sr-only">{l}</dt><dd className="text-2xl font-semibold num">{v}</dd><div className="text-xs uppercase tracking-[0.12em] text-subtle">{l}</div></div>
              ))}
            </dl>
          </div>
          <Suspense fallback={<SkeletonCard h="h-[30rem]" />}><HeroComparison /></Suspense>
        </PageContainer>
      </section>

      <PageContainer className="space-y-16 pt-4">
        <section aria-labelledby="featured-h">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div><CardTitle id="featured-h">Featured comparisons</CardTitle><p className="mt-1 text-2xl font-semibold tracking-tight">Laps worth a second look</p></div>
            <Link href="/compare" className="hidden text-sm text-muted hover:text-fg sm:block">Build your own →</Link>
          </div>
          <FeaturedGrid />
        </section>

        <section aria-labelledby="how-h">
          <CardTitle id="how-h">How it works</CardTitle>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-2xl border border-border bg-surface/60 p-5">
                <span className="text-sm text-accent num">{s.n}</span>
                <h3 className="mt-2 font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm text-muted">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-6 rounded-2xl border border-border bg-surface/60 p-6 sm:p-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <CardTitle>Built to be trusted</CardTitle>
            <p className="mt-2 text-2xl font-semibold tracking-tight">Numbers you can check.</p>
          </div>
          <ul className="grid gap-4 text-sm text-muted sm:grid-cols-2">
            <li><b className="text-fg">Aligned by distance.</b> Laps are compared metre by metre, never sample by sample.</li>
            <li><b className="text-fg">Delta that adds up.</b> The gap at the line always equals the official lap-time difference.</li>
            <li><b className="text-fg">No invented values.</b> A missing signal shows as a gap, never as zero.</li>
            <li><b className="text-fg">No AI guesswork.</b> Every takeaway is generated by fixed, documented rules. <Link className="underline underline-offset-4 hover:text-fg" href="/methodology">Methodology →</Link></li>
          </ul>
        </section>
      </PageContainer>
    </>
  );
}
