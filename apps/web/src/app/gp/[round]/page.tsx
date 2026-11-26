import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { PageContainer } from "@/components/site";
import { Countdown, LocalClock } from "@/components/clock";
import { SessionTabs } from "@/components/session-tabs";
import { Track3D } from "@/components/track-3d";
import { ErrorState, SkeletonCard } from "@/components/states";
import { getGrandPrix, getSeason } from "@/server/season";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ round: string }>; searchParams: Promise<{ season?: string }> };

const parse = async ({ params, searchParams }: Props) => {
  const round = z.coerce.number().int().min(1).max(40).safeParse((await params).round);
  const season = z.coerce.number().int().min(1950).max(2100).safeParse((await searchParams).season);
  return { round: round.success ? round.data : null, season: season.success ? season.data : null };
};

export async function generateMetadata(p: Props): Promise<Metadata> {
  const { round, season } = await parse(p);
  if (!round) return { title: "Grand Prix" };
  const s = await getSeason(season ?? "current");
  const r = s?.races.find((x) => x.round === round);
  return { title: r ? `${r.name} ${r.season}` : `Round ${round}` };
}

async function Results({ season, round, tz }: { season: number; round: number; tz: string }) {
  const gp = await getGrandPrix(season, round).catch(() => null);
  if (!gp) return <ErrorState title="Results unavailable" message="Session results couldn't be loaded right now. Please try again shortly." />;
  return (
    <>
      <SessionTabs tables={gp.tables} tz={tz} />
      {gp.meetingKey && (
        <p className="mt-4 text-sm text-muted">
          Want the telemetry? <Link className="underline underline-offset-4 hover:text-fg" href={`/events/${gp.meetingKey}`}>Open this weekend in the lap comparer →</Link>
        </p>
      )}
    </>
  );
}

export default async function GrandPrix(p: Props) {
  const { round, season: sp } = await parse(p);
  if (!round) notFound();
  const s = await getSeason(sp ?? "current");
  if (!s) return <PageContainer><ErrorState title="Season data unavailable" message="The calendar couldn't be loaded right now. Please try again in a minute." /></PageContainer>;
  const race = s.races.find((r) => r.round === round);
  if (!race) notFound();
  const prev = s.races.find((r) => r.round === round - 1), next = s.races.find((r) => r.round === round + 1);
  const now = Date.now();
  const upcoming = race.sessions.find((x) => Date.parse(x.start) > now);

  return (
    <PageContainer className="space-y-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <span><Link href="/" className="hover:text-fg">{s.season} season</Link> <span aria-hidden>/</span> Round {race.round}</span>
        <span className="flex gap-2">
          {prev && <Link className="rounded-lg border border-border px-3 py-1.5 hover:border-border-strong hover:text-fg" href={`/gp/${prev.round}?season=${s.season}`}>← {prev.locality}</Link>}
          {next && <Link className="rounded-lg border border-border px-3 py-1.5 hover:border-border-strong hover:text-fg" href={`/gp/${next.round}?season=${s.season}`}>{next.locality} →</Link>}
        </span>
      </nav>

      <section className="grid gap-5 lg:grid-cols-[1fr_1.6fr]" aria-labelledby="gp-h">
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-subtle num">Round {String(race.round).padStart(2, "0")}{race.hasSprint ? " · Sprint weekend" : ""}</p>
            <h1 id="gp-h" className="mt-2 text-[clamp(2.25rem,5vw,4rem)] uppercase leading-[0.9]">{race.name}</h1>
            <p className="mt-1 text-muted">{race.circuitName} · {race.locality}, {race.country}</p>
          </div>
          <div className="rounded-lg border-2 border-border-strong bg-surface p-4">
            <div className="stamp text-[10px] text-subtle">Right now in {race.locality}</div>
            <LocalClock tz={race.tz} lat={race.lat} lng={race.lng} className="mt-1 block text-2xl" />
          </div>
          {race.podium.length > 0 ? (
            <ol className="grid grid-cols-3 gap-2" aria-label="Podium">
              {race.podium.map((d, i) => (
                <li key={d.id} className={`relative overflow-hidden rounded-lg border-2 border-border-strong p-3 text-center ${i === 0 ? "bg-accent text-bg shadow-[6px_6px_0_var(--color-blood)]" : "bg-surface shadow-[4px_4px_0_var(--color-cobalt)]"}`}>
                  <div className="absolute inset-x-0 top-0 h-1" style={{ background: d.colour }} aria-hidden />
                  <img src={d.portrait} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
                    className="pointer-events-none mx-auto -mb-1 h-24 object-contain object-bottom sm:h-28" />
                  <div className={`stamp text-[10px] ${i === 0 ? "text-bg" : "text-subtle"}`}>P{i + 1}</div>
                  <div className="text-xl">{d.code}</div>
                  <div className={`mono truncate text-xs ${i === 0 ? "text-bg" : "text-muted"}`}>{d.team}</div>
                </li>
              ))}
            </ol>
          ) : upcoming ? (
            <div className="rounded-lg border-2 border-border-strong bg-surface p-4 shadow-[6px_6px_0_var(--color-blood)]">
              <div className="stamp mb-2 text-[11px] text-muted">{upcoming.label} starts in</div>
              <Countdown to={upcoming.start} />
            </div>
          ) : null}
        </div>
        <Track3D src={`/api/circuit-track?season=${s.season}&round=${race.round}`} className="h-[380px] sm:h-[480px] lg:h-[560px]" />
      </section>

      <section aria-labelledby="res-h">
        <h2 id="res-h" className="mb-4 border-b-2 border-border-strong pb-3 text-[clamp(1.6rem,3.6vw,2.5rem)] uppercase leading-none"><span className="outline-text mr-3">01</span>Every session</h2>
        <Suspense fallback={<SkeletonCard h="h-[480px]" />}><Results season={s.season} round={race.round} tz={race.tz} /></Suspense>
      </section>
    </PageContainer>
  );
}
