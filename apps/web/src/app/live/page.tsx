import type { Metadata } from "next";
import { PageContainer } from "@/components/site";
import { LiveDashboard } from "@/components/live-dashboard";
import { getLiveSnapshot } from "@/server/live";

export const metadata: Metadata = { title: "Live timing", description: "Live F1 session dashboard: positions, gaps, sectors, tyres, race control and weather." };
export const dynamic = "force-dynamic";

export default async function Live() {
  const snap = await getLiveSnapshot();
  return (
    <PageContainer>
      <LiveDashboard initial={snap} />
      <p className="mt-6 max-w-3xl text-xs text-subtle">
        Real-time data needs a self-hosted <a className="underline underline-offset-4 hover:text-fg" href="https://github.com/julesr0y/f1-livetiming-api" rel="noopener noreferrer">f1-livetiming-api</a> instance
        (set <code className="num">LIVETIMING_API_URL</code>). Without it this page shows the most recent session from OpenF1 and says so. Unofficial; not affiliated with Formula 1.
      </p>
    </PageContainer>
  );
}
