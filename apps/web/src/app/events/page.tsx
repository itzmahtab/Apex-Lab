import type { Metadata } from "next";
import { PageContainer } from "@/components/site";
import { Badge, Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { getRepository } from "@/server/repository";
import { defaultSelection, toQueryString } from "@/server/comparison";

export const metadata: Metadata = { title: "Events" };
export const dynamic = "force-dynamic";

export default async function Events() {
  const c = await getRepository().getCatalog();
  const demo = defaultSelection(c);
  return (
    <PageContainer>
      <h1 className="text-3xl font-bold tracking-tight">Events & sessions</h1>
      <p className="text-muted mt-1">Sessions with prepared data. Only the synthetic demo session is available in this local build.</p>
      <div className="mt-6 space-y-6">
        {c.seasons.map((s) => (
          <section key={s.year} aria-labelledby={`s${s.year}`}>
            <h2 id={`s${s.year}`} className="text-xl font-semibold mb-3">{s.year}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {c.events.filter((e) => s.eventKeys.includes(e.key)).map((e) => (
                <Card key={e.key}>
                  <h3 className="font-semibold">{e.name}</h3>
                  <p className="text-sm text-muted">{e.circuitName}</p>
                  <ul className="mt-3 space-y-2">
                    {c.sessions.filter((x) => x.eventKey === e.key).map((x) => (
                      <li key={x.key} className="flex flex-wrap items-center gap-2 text-sm">
                        {x.name}
                        {x.source.rightsStatus === "synthetic-demo" && <Badge tone="warn">Demo data</Badge>}
                        <span className="text-muted">{x.drivers.length} drivers · {x.laps.length} laps</span>
                      </li>
                    ))}
                  </ul>
                  {demo && <div className="mt-4"><LinkButton href={`/compare?${toQueryString(demo)}`}>Compare laps</LinkButton></div>}
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageContainer>
  );
}
