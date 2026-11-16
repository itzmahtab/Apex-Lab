import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { comparisonQuerySchema } from "@apexlab/contracts";
import { PageContainer } from "@/components/site";
import { CompareControls, type Selection } from "@/components/compare-controls";
import { ComparisonResultView } from "@/components/comparison-view";
import { ShareCardPreview } from "@/components/share";
import { EmptyState, ErrorState, SkeletonCard } from "@/components/states";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildComparison, defaultSelection, toQueryString } from "@/server/comparison";
import { AppError } from "@/server/errors";
import { getRepository } from "@/server/repository";

export const dynamic = "force-dynamic";
type SP = Promise<Record<string, string | string[] | undefined>>;

const flat = (sp: Record<string, string | string[] | undefined>) =>
  Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const q = flat(await searchParams);
  try {
    const c = await buildComparison(q);
    const parsed = comparisonQuerySchema.parse(q);
    const qs = toQueryString(parsed);
    const title = `${c.a.abbreviation} vs ${c.b.abbreviation} — ${c.session.name}${c.source.isDemo ? " (demo data)" : ""}`;
    const description = `${c.summary}${c.source.isDemo ? " Synthetic demo data." : ""}`;
    return {
      title, description, alternates: { canonical: `/compare?${qs}` },
      openGraph: { title, description, images: [{ url: `/api/share-card?${qs}`, width: 1200, height: 630 }] },
      twitter: { card: "summary_large_image", title, description, images: [`/api/share-card?${qs}`] },
    };
  } catch {
    return { title: "Compare laps", description: "Pick two drivers and laps to compare." }; // safe fallback
  }
}

async function Result({ query }: { query: Record<string, string | undefined> }) {
  try {
    const c = await buildComparison(query);
    const qs = toQueryString(comparisonQuerySchema.parse(query));
    return (
      <ComparisonResultView c={c}>
        <Card aria-labelledby="share-h">
          <h2 id="share-h" className="text-lg font-semibold">Share this comparison</h2>
          <p className="text-sm text-muted mb-3">The link restores exactly this selection. The card is generated on the server and includes the {c.source.isDemo ? "demo-data and " : ""}unofficial-project notice.</p>
          <ShareCardPreview query={qs} alt={`Share card: ${c.a.abbreviation} versus ${c.b.abbreviation}, delta ${c.lapDeltaMs ?? "unavailable"} milliseconds`} />
        </Card>
      </ComparisonResultView>
    );
  } catch (e) {
    const known = e instanceof AppError;
    if (!known) console.error("[apexlab] compare render failed", e);
    const notFound = known && e.code === "NOT_FOUND";
    return (
      <ErrorState
        title={notFound ? "We couldn't find that comparison" : "This comparison can't be shown"}
        message={known ? e.message : "Something went wrong while loading the data. Please try again."}
        action={<div className="flex gap-3"><LinkButton href={`/compare?${new URLSearchParams(Object.entries(query).filter((e): e is [string, string] => !!e[1])).toString()}`}>Retry</LinkButton><LinkButton href="/compare" variant="ghost">Start over</LinkButton></div>}
      />
    );
  }
}

export default async function ComparePage({ searchParams }: { searchParams: SP }) {
  const query = flat(await searchParams);
  const catalog = await getRepository().getCatalog().catch(() => null);
  if (!catalog) return <PageContainer><ErrorState message="Data is temporarily unavailable. Please try again shortly." /></PageContainer>;

  const value: Selection = {
    session: query.session, a: query.a, b: query.b,
    la: query.la ? Number(query.la) : undefined, lb: query.lb ? Number(query.lb) : undefined,
  };
  const complete = comparisonQuerySchema.safeParse(query).success;
  const demo = defaultSelection(catalog);
  const isDemoSession = catalog.sessions.find((s) => s.key === query.session)?.source.rightsStatus === "synthetic-demo";

  return (
    <PageContainer>
      <nav aria-label="Breadcrumb" className="text-sm text-muted mb-2"><ol className="flex gap-2"><li><Link href="/" className="hover:text-fg">Home</Link></li><li aria-hidden>/</li><li aria-current="page">Compare</li></ol></nav>
      <h1 className="text-3xl font-bold tracking-tight">Compare laps</h1>
      <p className="text-muted mt-1 mb-5">Choose a session, two drivers and a lap each.{isDemoSession ? " This session is synthetic demo data." : ""}</p>
      <CompareControls catalog={catalog} value={value} />
      <div className="mt-5">
        {complete ? (
          <Suspense key={JSON.stringify(query)} fallback={<div className="space-y-4" role="status" aria-label="Loading comparison"><SkeletonCard h="h-40" /><SkeletonCard /><SkeletonCard /></div>}>
            <Result query={query} />
          </Suspense>
        ) : (
          <EmptyState title="Nothing selected yet" action={demo && <LinkButton href={`/compare?${toQueryString(demo)}`} variant="primary">Load the demo comparison</LinkButton>}>
            Pick a session and two different drivers above, or load the demo comparison (synthetic data) to see how it works.
          </EmptyState>
        )}
      </div>
    </PageContainer>
  );
}
