import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { comparisonQuerySchema, keySchema } from "@apexlab/contracts";
import { PageContainer } from "@/components/site";
import { CompareControls, type ControlsInitial } from "@/components/compare-controls";
import { ComparisonResultView } from "@/components/comparison-view";
import { ShareCardPreview } from "@/components/share";
import { ErrorState, SkeletonCard } from "@/components/states";
import { FeaturedGrid } from "@/components/featured";
import { LinkButton } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { buildComparison, completeSelection, loadSession, toQueryString } from "@/server/comparison";
import { AppError } from "@/server/errors";
import { getRepository } from "@/server/repository";

export const dynamic = "force-dynamic";
type SP = Promise<Record<string, string | string[] | undefined>>;

const flat = (sp: Record<string, string | string[] | undefined>) =>
  Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])) as Record<string, string | undefined>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const q = flat(await searchParams);
  const parsed = comparisonQuerySchema.safeParse(q);
  if (!parsed.success) return { title: "Compare laps", description: "Pick any two F1 laps from 2023 onwards and see exactly where the time went." };
  try {
    const s = await loadSession(parsed.data.session);
    const A = s.drivers.find((d) => d.key === parsed.data.a), B = s.drivers.find((d) => d.key === parsed.data.b);
    const qs = toQueryString(parsed.data);
    const title = `${A?.abbreviation ?? "A"} vs ${B?.abbreviation ?? "B"} · ${s.event.name} ${s.event.year} ${s.session.name}`;
    const description = `Lap ${parsed.data.la} vs lap ${parsed.data.lb}: sector deltas, speed traces and a track dominance map on ApexLab.`;
    return {
      title, description, alternates: { canonical: `/compare?${qs}` },
      openGraph: { title, description, images: [{ url: `/api/share-card?${qs}`, width: 1200, height: 630 }] },
      twitter: { card: "summary_large_image", title, description, images: [`/api/share-card?${qs}`] },
    };
  } catch {
    return { title: "Compare laps" }; // safe fallback
  }
}

async function Result({ query }: { query: Record<string, string | undefined> }) {
  try {
    const c = await buildComparison(query);
    const qs = toQueryString(comparisonQuerySchema.parse(query));
    return (
      <ComparisonResultView c={c}>
        <Card aria-labelledby="share-h">
          <CardTitle id="share-h">Share</CardTitle>
          <p className="mb-4 mt-1 text-sm text-muted">The link restores exactly this comparison. The card is rendered on the server and works as a social preview.</p>
          <ShareCardPreview query={qs} alt={`Share card: ${c.a.abbreviation} versus ${c.b.abbreviation}`} />
        </Card>
      </ComparisonResultView>
    );
  } catch (e) {
    const known = e instanceof AppError;
    if (!known) console.error("[apexlab] compare render failed", e);
    const retry = `/compare?${new URLSearchParams(Object.entries(query).filter((x): x is [string, string] => !!x[1])).toString()}`;
    return (
      <ErrorState
        title={known && e.code === "UPSTREAM_UNAVAILABLE" ? "Live data is unavailable right now" : "This comparison can't be shown"}
        message={known ? e.message : "Something went wrong while loading the data. Please try again."}
        action={<div className="flex gap-3"><LinkButton href={retry}>Try again</LinkButton><LinkButton href="/compare" variant="ghost">Start over</LinkButton></div>}
      />
    );
  }
}

async function controlsFor(query: Record<string, string | undefined>): Promise<ControlsInitial> {
  const repo = getRepository();
  const years = await repo.listSeasons();
  const base: ControlsInitial = { years, year: years[0]!, events: [], eventKey: null, sessions: [], sessionKey: null, drivers: [], laps: [], selection: {} };
  const sk = keySchema.safeParse(query.session);
  if (!sk.success) {
    return { ...base, events: await repo.listEvents(base.year).catch(() => []) };
  }
  const s = await loadSession(sk.data);
  const [events, ev] = await Promise.all([repo.listEvents(s.event.year).catch(() => [s.event]), repo.getEvent(s.event.key).catch(() => null)]);
  return {
    years: years.includes(s.event.year) ? years : [...years, s.event.year],
    year: s.event.year, events: events.length ? events : [s.event], eventKey: s.event.key,
    sessions: ev?.sessions ?? [s.session], sessionKey: s.session.key,
    drivers: s.drivers, laps: s.laps,
    selection: { a: query.a, b: query.b, la: query.la ? Number(query.la) : undefined, lb: query.lb ? Number(query.lb) : undefined },
  };
}

export default async function ComparePage({ searchParams }: { searchParams: SP }) {
  const query = flat(await searchParams);

  // A session with a partial selection is completed server-side (top-2 drivers, fastest laps) and redirected
  // to its canonical, fully specified URL — so every result page has a stable share link.
  if (query.session && !comparisonQuerySchema.safeParse(query).success) {
    let target: string | null = null;
    try {
      const s = await loadSession(query.session);
      const full = completeSelection(s, { a: query.a, b: query.b, la: query.la ? Number(query.la) : undefined, lb: query.lb ? Number(query.lb) : undefined });
      if (full) target = `/compare?${toQueryString(full)}`;
    } catch { /* fall through to the error UI below */ }
    if (target) redirect(target);
  }

  let initial: ControlsInitial | null = null;
  let loadError: string | null = null;
  try { initial = await controlsFor(query); } catch (e) { loadError = e instanceof AppError ? e.message : "Data is temporarily unavailable."; }
  const complete = comparisonQuerySchema.safeParse(query).success;

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Compare laps</h1>
        <p className="mt-1 text-muted">Any two laps from the same session, 2023 onwards. Choose a session and the two fastest drivers load automatically.</p>
      </div>
      {initial ? <CompareControls initial={initial} /> : <ErrorState message={loadError ?? "Data is temporarily unavailable."} action={<LinkButton href="/compare">Try again</LinkButton>} />}
      <div className="mt-6">
        {complete ? (
          <Suspense key={JSON.stringify(query)} fallback={
            <div className="space-y-5" role="status" aria-label="Loading comparison">
              <SkeletonCard h="h-64" /><div className="grid gap-5 lg:grid-cols-5"><div className="lg:col-span-3"><SkeletonCard h="h-96" /></div><div className="lg:col-span-2"><SkeletonCard h="h-96" /></div></div><SkeletonCard h="h-[36rem]" />
              <p className="text-center text-sm text-subtle">Fetching telemetry from OpenF1 and aligning both laps…</p>
            </div>}>
            <Result query={query} />
          </Suspense>
        ) : query.session ? (
          <ErrorState title="That session has no comparable laps" message="Either the session has not happened yet or no timed laps with telemetry exist. Pick another session above." />
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Or start from a classic</h2>
            <FeaturedGrid />
          </div>
        )}
      </div>
    </PageContainer>
  );
}
