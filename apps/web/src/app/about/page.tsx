import type { Metadata } from "next";
import { PageContainer } from "@/components/site";

export const metadata: Metadata = { title: "About" };

export default function Page() {
  return (
    <PageContainer>
      <article className="max-w-3xl space-y-4 text-muted [&_h1]:text-fg [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:text-fg [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        <h1>About</h1>
        <p>ApexLab is an independent project for fans who want to know <em>why</em> one lap beat another: which corners, which braking points, how much throttle. It turns public timing and telemetry into a comparison anyone can read in seconds and share with one link.</p>
        <p><strong className="text-fg">How it is built.</strong> A Next.js 16 app running on Cloudflare Workers, a typed TypeScript analytics engine for alignment and deltas, a validated OpenF1 client with layered caching, and a Python ingestion CLI for offline snapshots. All of it is open source.</p>
        <p><strong className="text-fg">Unofficial.</strong> ApexLab is not affiliated with, endorsed by or connected to Formula 1, the FIA, or any team or driver. It uses no official logos, photography or broadcast material.</p>
      </article>
    </PageContainer>
  );
}
