import type { Metadata } from "next";
import { PageContainer } from "@/components/site";

export const metadata: Metadata = { title: "Terms" };

export default function Page() {
  return (
    <PageContainer>
      <article className="max-w-3xl space-y-4 text-muted [&_h1]:text-fg [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:text-fg [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        <h1>Terms</h1>
        <p>ApexLab is a free, non-commercial fan project provided as is, without warranty. Data comes from third-party sources and may be incomplete or wrong. It is not official Formula 1 data and must not be relied on for betting or any commercial purpose.</p>
      </article>
    </PageContainer>
  );
}
