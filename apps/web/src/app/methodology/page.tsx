import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/site";
import { METHODOLOGY } from "@apexlab/analytics";

export const metadata: Metadata = { title: "Data & methodology", description: "Where ApexLab's data comes from and exactly how every number is calculated." };

const prose = "max-w-3xl space-y-4 text-muted [&_h1]:text-fg [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-fg [&_strong]:text-fg [&_a]:underline [&_a]:underline-offset-4 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_code]:rounded [&_code]:bg-elevated [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-fg";

export default function Methodology() {
  return (
    <PageContainer>
      <article className={prose}>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Data & methodology</h1>
        <p className="text-lg">Every number on ApexLab can be traced to its source and recomputed from the rules below.</p>

        <h2>Where the data comes from</h2>
        <p><strong>OpenF1</strong> (<a href="https://openf1.org" rel="noopener noreferrer">openf1.org</a>) is a free, open-source, unofficial API that republishes Formula 1 timing data. ApexLab uses its sessions, drivers, laps, tyre stints, car telemetry (speed, throttle, brake, gear, RPM, DRS at roughly 3.7 Hz) and car position data. Coverage starts with the 2023 season.</p>
        <ul>
          <li>Responses are validated against a schema before use. Anything malformed is rejected, never shown.</li>
          <li>Completed sessions never change, so their responses are cached for 30 days (Cloudflare KV in production). Calendars refresh hourly.</li>
          <li>OpenF1 does not publish deleted (track-limits) laps, so lap validity is shown as unknown rather than guessed.</li>
        </ul>
        <p>An offline synthetic demo session also exists for development and tests. It is always labelled as demo data: <Link href="/compare?session=demo-qualifying">open the demo</Link>.</p>

        <h2>How a comparison is calculated</h2>
        <ul>{METHODOLOGY.map((m) => <li key={m}>{m}</li>)}</ul>

        <h2>Distance from speed</h2>
        <p>OpenF1 telemetry has timestamps but no distance channel. ApexLab integrates speed over time (trapezoidal rule) from the lap&apos;s start timestamp to its official duration, interpolating the boundary samples rather than guessing. Integrated laps of the same circuit differ by about 0.5–2 %, so both laps are scaled to their mean length before alignment. That guarantees the cumulative gap at the finish line equals the official lap-time difference. The figure shown as “lap length” is that mean, so it is an estimate, not the official circuit length.</p>

        <h2>Track dominance</h2>
        <p>The lap is split into 24 equal-length mini-sectors. For each one, the change in the cumulative gap across it says who lost time there. A change within 5 ms counts as a tie. The circuit is drawn from Driver A&apos;s position samples, mapped to distance through the same time→distance trace.</p>

        <h2>Limitations</h2>
        <ul>
          <li>At about 3.7 Hz, very short events (a brake tap, a gear blip) can fall between samples.</li>
          <li>Brake is an on/off signal in this source, not pressure.</li>
          <li>Interpolation does not add precision. It only places both laps on the same axis.</li>
        </ul>

        <h2>Rights</h2>
        <p>ApexLab is an unofficial, non-commercial fan project and is not affiliated with Formula 1. It uses no official logos, photography or broadcast material. Formula 1 timing data belongs to its rights holders, and public commercial use would need their permission, so no ads or paid features exist.</p>
      </article>
    </PageContainer>
  );
}
