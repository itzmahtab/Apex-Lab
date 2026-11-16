import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatLapTime } from "@apexlab/analytics";
import type { SessionDetail } from "@apexlab/contracts";
import { PageContainer } from "@/components/site";
import { Card, CardTitle } from "@/components/ui/card";
import { CompoundBadge } from "@/components/driver";
import { ErrorState } from "@/components/states";
import { leaderboard, loadSession } from "@/server/comparison";
import { AppError } from "@/server/errors";
import { COMPOUND, teamHex } from "@/lib/colors";
import { formatDay } from "@/lib/format";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ sessionKey: string }> };

async function load(params: P["params"]): Promise<SessionDetail> {
  try { return await loadSession((await params).sessionKey); }
  catch (e) { if (e instanceof AppError && (e.code === "NOT_FOUND" || e.code === "VALIDATION_ERROR")) notFound(); throw e; }
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  try { const s = await load(params); return { title: `${s.event.name} ${s.event.year} · ${s.session.name}` }; } catch { return { title: "Session" }; }
}

function Strategy({ s }: { s: SessionDetail }) {
  const maxLap = Math.max(1, ...s.laps.map((l) => l.lapNumber));
  const order = leaderboard(s).map((r) => r.driver);
  const rows = order.map((d) => ({ d, stints: s.stints.filter((x) => x.driverKey === d.key).sort((a, b) => a.stintNumber - b.stintNumber) })).filter((r) => r.stints.length);
  if (!rows.length) return null;
  return (
    <Card>
      <CardTitle>Tyre strategy</CardTitle>
      <p className="mb-4 mt-1 text-sm text-muted">Stints by lap. Letters mark the compound: S soft, M medium, H hard, I intermediate, W wet.</p>
      <div className="space-y-1.5">
        {rows.map(({ d, stints }) => (
          <div key={d.key} className="grid grid-cols-[3rem_1fr] items-center gap-2">
            <span className="text-xs font-semibold num" style={{ color: teamHex(d.teamColour, "#9aa4b2") }}>{d.abbreviation}</span>
            <div className="relative h-5 rounded bg-bg/60" role="img" aria-label={`${d.abbreviation}: ${stints.map((x) => `${x.compound ?? "unknown"} laps ${x.lapStart}–${x.lapEnd}`).join(", ")}`}>
              {stints.map((x) => {
                if (x.lapStart == null || x.lapEnd == null) return null;
                const c = COMPOUND[(x.compound ?? "").toUpperCase()];
                return (
                  <span key={x.stintNumber} className="absolute top-0 flex h-5 items-center justify-center overflow-hidden rounded border-r-2 border-bg text-[10px] font-bold"
                    style={{ left: `${((x.lapStart - 1) / maxLap) * 100}%`, width: `${((x.lapEnd - x.lapStart + 1) / maxLap) * 100}%`, background: c?.colour ?? "#4b5363", color: c?.text ?? "#fff" }}>
                    {c?.label ?? "?"}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-[3rem_1fr] text-[11px] text-subtle num"><span /><div className="flex justify-between"><span>Lap 1</span><span>Lap {maxLap}</span></div></div>
    </Card>
  );
}

export default async function SessionPage({ params }: P) {
  let s: SessionDetail;
  try { s = await load(params); }
  catch (e) { return <PageContainer><ErrorState message={e instanceof AppError ? e.message : "Could not load this session."} /></PageContainer>; }
  const board = leaderboard(s);
  const pole = board[0]?.lap?.lapTimeMs ?? null;
  const top = board.filter((r) => r.lap).slice(0, 2);

  return (
    <PageContainer>
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href={`/events?year=${s.event.year}`} className="hover:text-fg">{s.event.year}</Link> <span aria-hidden>/</span>{" "}
        <Link href={`/events/${s.event.key}`} className="hover:text-fg">{s.event.name}</Link> <span aria-hidden>/</span>
      </nav>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{s.session.name}</h1>
          <p className="mt-1 text-muted">{s.event.name} {s.event.year} · <span className="num">{formatDay(s.session.startDate)}</span></p>
        </div>
        {top.length === 2 && (
          <Link href={`/compare?session=${s.session.key}&a=${top[0]!.driver.key}&b=${top[1]!.driver.key}`} className="rounded-xl bg-accent-fill px-4 py-2.5 text-sm font-medium text-white hover:bg-[#c4271b]">
            Compare {top[0]!.driver.abbreviation} vs {top[1]!.driver.abbreviation} →
          </Link>
        )}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Card className="p-0 sm:p-0">
          <div className="p-4 pb-2 sm:p-6 sm:pb-2"><CardTitle>Fastest laps</CardTitle><p className="mt-1 text-sm text-muted">Each driver&apos;s best timed lap (out-laps excluded). Pick a row to compare it with the fastest.</p></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Fastest lap per driver</caption>
              <thead><tr className="border-b border-border text-left text-xs uppercase tracking-[0.1em] text-subtle">
                <th scope="col" className="py-2 pl-4 sm:pl-6">Rank</th><th scope="col" className="py-2">Driver</th><th scope="col" className="py-2">Lap time</th><th scope="col" className="py-2">Gap</th><th scope="col" className="py-2">Tyre</th><th scope="col" className="py-2 pr-4 text-right sm:pr-6"><span className="sr-only">Action</span></th>
              </tr></thead>
              <tbody>
                {board.map((r, i) => (
                  <tr key={r.driver.key} className="border-b border-border/60 last:border-0 hover:bg-elevated/40">
                    <td className="py-2.5 pl-4 text-muted num sm:pl-6">{r.lap ? i + 1 : "—"}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="h-6 w-1 rounded-full" style={{ background: teamHex(r.driver.teamColour, "#4b5363") }} aria-hidden />
                        <div><div><span className="font-semibold num">{r.driver.abbreviation}</span> <span className="text-muted">{r.driver.displayName}</span></div><div className="text-xs text-subtle">{r.driver.teamName}</div></div>
                      </div>
                    </td>
                    <td className="py-2.5 num">{formatLapTime(r.lap?.lapTimeMs)}</td>
                    <td className="py-2.5 text-muted num">{r.lap && pole != null ? (i === 0 ? "—" : `+${((r.lap.lapTimeMs! - pole) / 1000).toFixed(3)}`) : ""}</td>
                    <td className="py-2.5"><CompoundBadge compound={r.lap?.compound} /></td>
                    <td className="py-2.5 pr-4 text-right sm:pr-6">
                      {r.lap && i > 0 && board[0]?.lap && (
                        <Link className="text-xs text-muted hover:text-fg" href={`/compare?session=${s.session.key}&a=${board[0].driver.key}&b=${r.driver.key}`}>vs P1 →</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Strategy s={s} />
      </div>
      <p className="mt-6 text-xs text-subtle">{s.source.attribution ?? s.source.name}</p>
    </PageContainer>
  );
}
