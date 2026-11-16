import { formatDelta } from "@apexlab/analytics";
import { Card, Badge } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { PageContainer } from "@/components/site";
import { SpeedChart } from "@/components/charts";
import { ErrorState } from "@/components/states";
import { buildComparison, defaultSelection, toQueryString } from "@/server/comparison";
import { getRepository } from "@/server/repository";
import { FadeIn } from "@/components/fade-in";

export const dynamic = "force-dynamic";

async function demo() {
  try {
    const sel = defaultSelection(await getRepository().getCatalog());
    if (!sel) return null;
    return { sel, c: await buildComparison(sel) };
  } catch {
    return "error" as const;
  }
}

const FEATURES = [
  { t: "Compare", d: "Pick any two drivers and laps from a session and see lap and sector deltas side by side." },
  { t: "Explore", d: "Speed, throttle and brake traces on a shared distance axis, with units and a data table." },
  { t: "Share", d: "Every comparison has a stable link and a downloadable card. Your selection is the URL." },
];

export default async function Home() {
  const d = await demo();
  return (
    <PageContainer>
      <section className="py-8 sm:py-14 max-w-3xl">
        <p className="text-sm text-telemetry font-medium">Independent F1 analytics</p>
        <h1 className="mt-2 text-4xl sm:text-6xl font-bold tracking-tight">Find where the lap was won.</h1>
        <p className="mt-4 text-lg text-muted">ApexLab turns timing and telemetry into clear comparisons you can understand — and share. The science behind the speed.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <LinkButton href="/compare" variant="primary" className="min-h-11 px-6 text-base">Compare laps</LinkButton>
          {d && d !== "error" && <LinkButton href={`/compare?${toQueryString(d.sel)}`}>Open the demo comparison</LinkButton>}
        </div>
      </section>

      <section aria-labelledby="demo-h" className="mt-4">
        {d === "error" ? <ErrorState message="The demo comparison could not be loaded. The rest of the site still works." /> : d ? (
          <FadeIn>
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="demo-h" className="text-lg font-semibold">{d.c.a.abbreviation} vs {d.c.b.abbreviation} — {d.c.session.name}</h2>
                {d.c.source.isDemo && <Badge tone="warn">Demo data · synthetic</Badge>}
              </div>
              <p className="text-sm text-muted mt-1">Lap delta ({d.c.b.abbreviation} − {d.c.a.abbreviation}): <strong className="text-fg">{formatDelta(d.c.lapDeltaMs)}</strong>. {d.c.summary}</p>
              <div className="mt-3"><SpeedChart data={d.c.points} labels={{ a: `${d.c.a.abbreviation} · lap ${d.c.a.lapNumber}`, b: `${d.c.b.abbreviation} · lap ${d.c.b.lapNumber}` }} height={220} /></div>
              <p className="text-xs text-muted mt-2">All values are invented for demonstration and are not real race data.</p>
            </Card>
          </FadeIn>
        ) : null}
      </section>

      <section aria-labelledby="feat-h" className="mt-10">
        <h2 id="feat-h" className="sr-only">Features</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => <Card key={f.t}><h3 className="font-semibold">{f.t}</h3><p className="mt-2 text-sm text-muted">{f.d}</p></Card>)}
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Transparent by design</h2>
        <p className="mt-2 text-sm text-muted">Times are integer milliseconds, telemetry is aligned by distance (never by array index), and missing signals are shown as gaps — never as zeros. Read the <a className="underline" href="/methodology">methodology</a>.</p>
      </section>
    </PageContainer>
  );
}
