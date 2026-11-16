import type { Metadata } from "next";
import { PageContainer } from "@/components/site";

export const metadata: Metadata = { title: "About" };

export default function Page() {
  return (
    <PageContainer>
      <article className="max-w-3xl space-y-4 text-muted [&_h1]:text-fg [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:text-fg [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        <h1>About</h1>
        <p>ApexLab is an independent project that helps fans compare laps and understand where time is gained or lost. It is built as a portfolio-grade full-stack project (Next.js and Python).</p>
        <p><strong className="text-fg">Unofficial.</strong> ApexLab is not affiliated with, endorsed by or connected to Formula 1, the FIA, any team or any driver. No official logos, photos or broadcast material are used.</p>
        <p><strong className="text-fg">Current state.</strong> This is a local MVP running on clearly labelled synthetic demo data. Nothing shown is a real race result.</p>
      </article>
    </PageContainer>
  );
}
