import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { PageContainer } from "@/components/site";
import { Badge } from "@/components/ui/card";
import { ErrorState } from "@/components/states";
import { getRepository } from "@/server/repository";
import { AppError } from "@/server/errors";
import { formatDateRange } from "@/lib/format";

export const metadata: Metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

export default async function Events({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const repo = getRepository();
  const years = await repo.listSeasons();
  const y = z.coerce.number().int().safeParse((await searchParams).year);
  const year = y.success && years.includes(y.data) ? y.data : years[0]!;
  let events: Awaited<ReturnType<typeof repo.listEvents>> = [];
  let error: string | null = null;
  try { events = await repo.listEvents(year); } catch (e) { error = e instanceof AppError ? e.message : "Could not load the calendar."; }
  const now = Date.now();
  let round = 0;

  return (
    <PageContainer>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{year} calendar</h1>
          <p className="mt-1 text-muted">Pick a weekend to see its sessions, leaderboards and tyre strategies.</p>
        </div>
        <nav aria-label="Season" className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface/80 p-1">
          {years.map((yy) => (
            <Link key={yy} href={`/events?year=${yy}`} aria-current={yy === year ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm num ${yy === year ? "bg-elevated text-fg" : "text-muted hover:text-fg"}`}>{yy}</Link>
          ))}
        </nav>
      </div>
      {error ? <div className="mt-6"><ErrorState message={error} /></div> : (
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => {
            const r = e.isTesting ? null : ++round;
            const done = e.endDate ? Date.parse(e.endDate) < now : false;
            const live = !done && e.startDate ? Date.parse(e.startDate) <= now : false;
            return (
              <li key={e.key}>
                <Link href={`/events/${e.key}`} className="group flex h-full flex-col rounded-2xl border border-border bg-surface/80 p-5 transition-all hover:-translate-y-0.5 hover:border-border-strong">
                  <div className="flex items-center justify-between text-xs text-subtle">
                    <span className="num">{r ? `ROUND ${String(r).padStart(2, "0")}` : "TESTING"}</span>
                    {live ? <Badge tone="live">This weekend</Badge> : !done ? <Badge>Upcoming</Badge> : null}
                  </div>
                  <span className="mt-3 text-lg font-semibold leading-snug">{e.name}</span>
                  <span className="text-sm text-muted">{[e.circuitName, e.countryName].filter(Boolean).join(" · ")}</span>
                  <span className="mt-4 text-sm text-subtle num">{formatDateRange(e.startDate, e.endDate)}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </PageContainer>
  );
}
