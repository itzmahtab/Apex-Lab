import Link from "next/link";
import type { ConstructorStanding, DriverStanding, Race } from "@/server/season";
import { Countdown, LocalClock, ZonedTime } from "@/components/clock";
import { Track3D } from "@/components/track-3d";
import { CardTitle } from "@/components/ui/card";

const Bar = ({ value, max, colour }: { value: number; max: number; colour: string }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-elevated" aria-hidden>
    <div className="h-full rounded-full" style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%`, background: colour }} />
  </div>
);

export function SectionHead({ id, kicker, title, action }: { id: string; kicker: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div><CardTitle id={id}>{kicker}</CardTitle><p className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</p></div>
      {action}
    </div>
  );
}

/** The next race weekend: countdown to its next session, schedule, local time, and the circuit in 3D. */
export function NextRace({ race }: { race: Race }) {
  const now = Date.now();
  const next = race.sessions.find((s) => Date.parse(s.start) > now) ?? race.sessions.at(-1)!;
  return (
    <section aria-labelledby="next-h" className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
      <div className="flex flex-col rounded-2xl border border-border bg-surface/80 p-5 sm:p-6">
        <CardTitle id="next-h">{race.status === "live" ? "Live this weekend" : "Next race"}</CardTitle>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">{race.name}</h2>
        <p className="text-muted">Round {race.round} · {race.circuitName}</p>
        <div className="mt-5">
          <div className="mb-2 text-sm text-muted">{next.label} starts in</div>
          <Countdown to={next.start} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-border bg-bg/60 p-3"><div className="text-[10px] uppercase tracking-[0.14em] text-subtle">Local time in {race.locality}</div><LocalClock tz={race.tz} lat={race.lat} lng={race.lng} className="mt-1 block" /></div>
          <div className="rounded-xl border border-border bg-bg/60 p-3"><div className="text-[10px] uppercase tracking-[0.14em] text-subtle">Lights out (your time)</div><div className="mt-1 text-fg"><ZonedTime iso={race.start} /></div></div>
        </div>
        <ul className="mt-5 divide-y divide-border/70 text-sm">
          {race.sessions.map((s) => (
            <li key={s.id} className={`flex items-center justify-between py-2 ${Date.parse(s.start) < now ? "text-subtle line-through decoration-border-strong" : ""}`}>
              <span>{s.label}</span>
              <span className="flex gap-4"><span className="hidden text-subtle sm:inline"><ZonedTime iso={s.start} tz={race.tz} withDay={false} /> local</span><ZonedTime iso={s.start} /></span>
            </li>
          ))}
        </ul>
        <Link href={`/gp/${race.round}?season=${race.season}`} className="mt-5 text-sm font-medium text-muted hover:text-fg">Full weekend page →</Link>
      </div>
      <Track3D src={`/api/circuit-track?season=${race.season}&round=${race.round}`} className="h-[380px] sm:h-[460px] lg:h-full lg:min-h-[520px]" />
    </section>
  );
}

/** Podium of the most recent race. */
export function LastRace({ race }: { race: Race }) {
  const order = [1, 0, 2]; // P2 · P1 · P3 visual podium
  return (
    <section aria-labelledby="last-h">
      <SectionHead id="last-h" kicker="Latest result" title={race.name} action={<Link href={`/gp/${race.round}?season=${race.season}`} className="text-sm text-muted hover:text-fg">All sessions →</Link>} />
      <ol className="grid grid-cols-3 items-end gap-2 sm:gap-4">
        {order.map((i) => {
          const d = race.podium[i];
          if (!d) return <li key={i} />;
          const h = i === 0 ? "pt-10 sm:pt-14" : i === 1 ? "pt-6 sm:pt-8" : "pt-4";
          return (
            <li key={d.id} className={`relative overflow-hidden rounded-2xl border border-border bg-surface/80 px-3 pb-4 text-center sm:px-5 ${h}`} style={{ order: order.indexOf(i) }}>
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: d.colour }} aria-hidden />
              <div className="pointer-events-none absolute -right-2 -top-4 text-7xl font-black text-white/[0.04] num sm:text-8xl" aria-hidden>{i + 1}</div>
              <div className="text-xs uppercase tracking-[0.14em] text-subtle">P{i + 1}{i === 0 ? " · Winner" : ""}</div>
              <div className="mt-1 text-2xl font-bold num sm:text-3xl">{d.code}</div>
              <div className="truncate text-sm text-fg">{d.name}</div>
              <div className="truncate text-xs text-muted">{d.team}</div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function DriverStandings({ rows, round }: { rows: DriverStanding[]; round: number | null }) {
  const max = rows[0]?.points ?? 0;
  const top = rows.slice(0, 10), rest = rows.slice(10);
  const Row = ({ d }: { d: DriverStanding }) => (
    <tr className="border-t border-border/70">
      <td className="py-2 pr-2 text-subtle num">{d.position}</td>
      <td className="py-2 pr-3">
        <div className="flex items-center gap-2"><span className="h-4 w-1 shrink-0 rounded-full" style={{ background: d.colour }} aria-hidden />
          <span className="font-semibold num">{d.code}</span><span className="hidden truncate text-muted sm:inline">{d.name}</span></div>
        <div className="mt-1.5 sm:pl-3"><Bar value={d.points} max={max} colour={d.colour} /></div>
      </td>
      <td className="hidden py-2 pr-3 text-muted md:table-cell">{d.team}</td>
      <td className="py-2 pr-3 text-right text-muted num">{d.wins}</td>
      <td className="py-2 text-right font-semibold num">{d.points}</td>
    </tr>
  );
  return (
    <div className="rounded-2xl border border-border bg-surface/80 p-4 sm:p-6">
      <div className="flex items-baseline justify-between"><h3 className="font-semibold">Drivers</h3>{round && <span className="text-xs text-subtle">after round {round}</span>}</div>
      <table className="mt-3 w-full text-sm">
        <caption className="sr-only">Drivers&apos; championship standings</caption>
        <thead><tr className="text-left text-xs text-subtle"><th scope="col" className="pb-2 font-normal">Pos</th><th scope="col" className="pb-2 font-normal">Driver</th><th scope="col" className="hidden pb-2 font-normal md:table-cell">Team</th><th scope="col" className="pb-2 text-right font-normal">Wins</th><th scope="col" className="pb-2 text-right font-normal">Pts</th></tr></thead>
        <tbody>{top.map((d) => <Row key={d.id} d={d} />)}</tbody>
      </table>
      {rest.length > 0 && (
        <details className="group mt-2">
          <summary className="cursor-pointer list-none py-2 text-sm text-muted hover:text-fg">Show all {rows.length} drivers <span className="inline-block transition-transform group-open:rotate-180" aria-hidden>▾</span></summary>
          <table className="w-full text-sm"><caption className="sr-only">Remaining drivers</caption><tbody>{rest.map((d) => <Row key={d.id} d={d} />)}</tbody></table>
        </details>
      )}
    </div>
  );
}

export function ConstructorStandings({ rows }: { rows: ConstructorStanding[] }) {
  const max = rows[0]?.points ?? 0;
  return (
    <div className="rounded-2xl border border-border bg-surface/80 p-4 sm:p-6">
      <h3 className="font-semibold">Constructors</h3>
      <ol className="mt-3 space-y-3 text-sm">
        {rows.map((t) => (
          <li key={t.teamId}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2"><span className="w-5 text-subtle num">{t.position}</span><span className="h-4 w-1 rounded-full" style={{ background: t.colour }} aria-hidden /><span className="truncate font-medium">{t.name}</span><span className="hidden text-xs text-subtle sm:inline num">{t.drivers.join(" · ")}</span></span>
              <span className="font-semibold num">{t.points}</span>
            </div>
            <div className="mt-1.5 pl-7"><Bar value={t.points} max={max} colour={t.colour} /></div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Full season calendar with winners and dates. */
export function CalendarGrid({ races }: { races: Race[] }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {races.map((r) => {
        const w = r.podium[0];
        const hot = r.status === "next" || r.status === "live";
        return (
          <li key={r.round}>
            <Link href={`/gp/${r.round}?season=${r.season}`} className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-surface/80 p-4 transition-all hover:-translate-y-0.5 hover:border-border-strong ${hot ? "border-accent/60" : "border-border"}`}>
              {w && <div className="absolute inset-y-0 left-0 w-1" style={{ background: w.colour }} aria-hidden />}
              <div className="flex items-center justify-between text-xs text-subtle">
                <span className="num">R{String(r.round).padStart(2, "0")}{r.hasSprint ? " · SPRINT" : ""}</span>
                {hot ? <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] text-accent">{r.status === "live" ? "Live" : "Next"}</span>
                  : r.status === "completed" ? <span>Done</span> : <span className="num">{new Date(r.start).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}</span>}
              </div>
              <span className="mt-2 font-semibold leading-snug">{r.name}</span>
              <span className="text-sm text-muted">{r.locality}, {r.country}</span>
              <span className="mt-3 text-sm">
                {w ? <span className="inline-flex items-center gap-1.5"><span aria-hidden>🏆</span><b className="num">{w.code}</b><span className="text-muted">{w.team}</span></span>
                  : <span className="text-subtle"><ZonedTime iso={r.start} /></span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
