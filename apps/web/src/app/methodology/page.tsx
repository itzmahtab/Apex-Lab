import type { Metadata } from "next";
import { PageContainer } from "@/components/site";

export const metadata: Metadata = { title: "Data & methodology" };

export default function Page() {
  return (
    <PageContainer>
      <article className="max-w-3xl space-y-4 text-muted [&_h1]:text-fg [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:text-fg [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        <h1>Data & methodology</h1>
        <h2>Demo data</h2><p>The bundled dataset is synthetic: a fictional circuit, season 2099 and fictional drivers, generated deterministically. It exists so the product works without network access or third-party data. It is always labelled as demo data.</p>
        <h2>Calculations</h2>
        <ul>
          <li>Lap and sector times are integer milliseconds.</li>
          <li>Delta = Driver B − Driver A. A positive value means B took longer.</li>
          <li>Sector deltas are shown only when both laps have that sector time.</li>
          <li>Telemetry is aligned on a shared distance axis (10 m steps) with linear interpolation. Samples are never matched by array index, and interpolation does not add measured precision.</li>
          <li>Missing signals stay missing: they appear as gaps or a notice, never as zero.</li>
          <li>The takeaway sentence is deterministic text generated from the numbers, not AI.</li>
        </ul>
        <h2>Real data</h2><p>Importing real timing data (for example via FastF1) is gated behind a data-rights review. See the project documentation in docs/data-rights.md. Rights to public or commercial use of real data are not assumed.</p>
      </article>
    </PageContainer>
  );
}
