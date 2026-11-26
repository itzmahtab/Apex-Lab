import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { keySchema } from "@apexlab/contracts";
import { PageContainer } from "@/components/site";
import { Badge } from "@/components/ui/card";
import { getRepository } from "@/server/repository";
import { formatDateRange, formatDay } from "@/lib/format";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ eventKey: string }> };

async function load(params: P["params"]) {
  const k = keySchema.safeParse((await params).eventKey);
  if (!k.success) notFound();
  const e = await getRepository().getEvent(k.data);
  if (!e) notFound();
  return e;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  try { const { event } = await load(params); return { title: `${event.name} ${event.year}` }; } catch { return { title: "Event" }; }
}

export default async function EventPage({ params }: P) {
  const { event, sessions } = await load(params);
  return (
    <PageContainer>
      <nav aria-label="Breadcrumb" className="text-sm text-muted"><Link href={`/events?year=${event.year}`} className="hover:text-fg">{event.year} calendar</Link> <span aria-hidden>/</span></nav>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{event.name}</h1>
      <p className="mt-1 text-muted">{[event.circuitName, event.location, event.countryName].filter(Boolean).join(" · ")} · <span className="num">{formatDateRange(event.startDate, event.endDate)}</span></p>
      {event.officialName && <p className="mt-1 text-xs uppercase tracking-[0.1em] text-subtle">{event.officialName}</p>}
      <ul className="mt-8 grid gap-3 md:grid-cols-2">
        {sessions.map((s) => (
          <li key={s.key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface/80 p-5">
            <div>
              <div className="flex items-center gap-2 font-semibold">{s.name}{s.status === "live" && <Badge tone="live">Live</Badge>}{s.status === "upcoming" && <Badge>Upcoming</Badge>}</div>
              <div className="text-sm text-muted num">{formatDay(s.startDate)}</div>
            </div>
            {s.status === "completed" && (
              <div className="flex gap-2">
                <Link href={`/sessions/${s.key}`} className="rounded-lg border border-border bg-elevated px-3 py-2 text-sm hover:border-border-strong">Results</Link>
                <Link href={`/compare?session=${s.key}`} className="rounded-lg bg-accent-fill px-3 py-2 text-sm uppercase text-bg hover:bg-[#b86b1f]">Compare</Link>
              </div>
            )}
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
