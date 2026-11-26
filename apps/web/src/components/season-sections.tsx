import Link from "next/link";
import type { ConstructorStanding, DriverStanding, Race } from "@/server/season";
import { Countdown, LocalClock, ZonedTime } from "@/components/clock";
import { Track3D } from "@/components/track-3d";
import { ArrowRightIcon, TrophyIcon } from "@/components/icons";

const pad = (n: number) => String(n).padStart(2, "0");

const Bar = ({ value, max, colour }: { value: number; max: number; colour: string }) => (
  <div className="h-2 w-full bg-elevated" aria-hidden>
    <div className="h-full" style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%`, background: colour }} />
  </div>
);

/** Section head: outlined index numeral, mono kicker, raw display title. */
export function SectionHead({ id, index, kicker, title, action }: { id: string; index?: string; kicker: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b-2 border-border-strong pb-3">
      <div className="flex items-end gap-4">
        {index && <span className="outline-text text-6xl leading-[0.8] sm:text-7xl" aria-hidden>{index}</span>}
        <div>
          <p className="stamp text-accent">{kicker}</p>
          <h2 id={id} className="mt-1 text-[clamp(1.6rem,3.6vw,2.5rem)] uppercase leading-[0.95]">{title}</h2>
        </div>
      </div>
      {action}
    </div>
  );
}

export const SectionLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="stamp inline-flex items-center gap-2 border-2 border-border-strong px-3 py-2 text-[11px] text-fg transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--color-cobalt)]">
    {children}<ArrowRightIcon className="h-3.5 w-3.5" />
  </Link>
);

/** The next race weekend: countdown, schedule and local time on a plate, the circuit in 3D overlapping it. */
export function NextRace({ race }: { race: Race }) {
  const now = Date.now();
  const next = race.sessions.find((s) => Date.parse(s.start) > now) ?? race.sessions.at(-1)!;
  return (
    <section aria-labelledby="next-h">
      <SectionHead id="next-h" index="01" kicker={race.status === "live" ? "Live this weekend" : "Next race"} title={race.name}
        action={<SectionLink href={`/gp/${race.round}?season=${race.season}`}>Weekend page</SectionLink>} />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="relative z-10 rounded-lg border-2 border-border-strong bg-surface p-5 shadow-[8px_8px_0_var(--color-blood)] sm:p-6 lg:col-span-5 lg:mt-10">
          <p className="mono text-xs text-muted">ROUND {pad(race.round)} / {race.circuitName.toUpperCase()}</p>
          <div className="mt-5">
            <div className="stamp mb-2 text-[11px] text-muted">{next.label} starts in</div>
            <Countdown to={next.start} />
          </div>
          <div className="mt-5 grid grid-cols-2 border-2 border-border text-sm">
            <div className="border-r-2 border-border p-3"><div className="stamp text-[10px] text-subtle">{race.locality} now</div><LocalClock tz={race.tz} lat={race.lat} lng={race.lng} className="mt-1 block" /></div>
            <div className="p-3"><div className="stamp text-[10px] text-subtle">Lights out · you</div><div className="mt-1 text-xs text-fg"><ZonedTime iso={race.start} /></div></div>
          </div>
          <ul className="mt-5 text-sm">
            {race.sessions.map((s) => {
              const past = Date.parse(s.start) < now;
              return (
                <li key={s.id} className={`flex items-center justify-between gap-3 border-b border-dashed border-border py-2 ${past ? "text-subtle line-through decoration-2" : ""}`}>
                  <span className="text-xs uppercase">{s.label}</span>
                  <span className="flex gap-4 text-xs"><span className="hidden text-subtle sm:inline"><ZonedTime iso={s.start} tz={race.tz} withDay={false} /> loc</span><ZonedTime iso={s.start} /></span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="lg:col-span-7 lg:-ml-10">
          <Track3D src={`/api/circuit-track?season=${race.season}&round=${race.round}`} className="h-[380px] sm:h-[460px] lg:h-[560px]" />
        </div>
      </div>
    </section>
  );
}

/** Podium of the most recent race as raw stepped blocks. */
export function LastRace({ race }: { race: Race }) {
  const order = [1, 0, 2]; // P2 · P1 · P3
  const heights = ["min-h-[15rem] sm:min-h-[19rem]", "min-h-[12rem] sm:min-h-[15rem]", "min-h-[10rem] sm:min-h-[12rem]"];
  return (
    <section aria-labelledby="last-h">
      <SectionHead id="last-h" index="02" kicker="Latest result" title={race.name} action={<SectionLink href={`/gp/${race.round}?season=${race.season}`}>All sessions</SectionLink>} />
      <ol className="grid grid-cols-3 items-end">
        {order.map((i) => {
          const d = race.podium[i];
          if (!d) return <li key={i} />;
          return (
            <li key={d.id} style={{ order: order.indexOf(i) }}
              className={`relative flex flex-col justify-end overflow-hidden border-2 border-border-strong p-3 sm:p-5 ${heights[i]} ${i === 0 ? "z-10 -mx-[2px] bg-accent text-bg shadow-[8px_8px_0_var(--color-blood)]" : "bg-surface"}`}>
              <span className={`pointer-events-none absolute -right-2 -top-6 text-[7rem] leading-none sm:text-[11rem] ${i === 0 ? "text-bg" : "outline-text"}`} aria-hidden>{i + 1}</span>
              <span className="absolute left-0 top-0 h-full w-2" style={{ background: d.colour }} aria-hidden />
              <div className={`stamp text-[10px] ${i === 0 ? "text-bg" : "text-subtle"}`}>P{i + 1}{i === 0 ? " / Winner" : ""}</div>
              <div className="mt-1 text-3xl leading-none sm:text-5xl">{d.code}</div>
              <div className="mt-1 truncate text-xs uppercase sm:text-sm">{d.name}</div>
              <div className={`mono truncate text-[11px] ${i === 0 ? "text-bg" : "text-muted"}`}>{d.team}</div>
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
    <tr className="border-t border-dashed border-border">
      <td className="mono py-2.5 pr-2 text-subtle">{pad(d.position)}</td>
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-2"><span className="h-4 w-1.5 shrink-0" style={{ background: d.colour }} aria-hidden />
          <span>{d.code}</span><span className="mono hidden truncate text-xs text-muted sm:inline">{d.name}</span></div>
        <div className="mt-1.5 sm:pl-3.5"><Bar value={d.points} max={max} colour={d.colour} /></div>
      </td>
      <td className="mono hidden py-2.5 pr-3 text-xs text-muted md:table-cell">{d.team}</td>
      <td className="num py-2.5 pr-3 text-right text-muted">{d.wins}</td>
      <td className="num py-2.5 text-right text-base text-fg">{d.points}</td>
    </tr>
  );
  return (
    <div className="rounded-lg border-2 border-border-strong bg-surface p-4 shadow-[8px_8px_0_var(--color-cobalt)] sm:p-6">
      <div className="flex items-baseline justify-between"><h3 className="text-lg uppercase">Drivers</h3>{round && <span className="mono text-xs text-subtle">AFTER R{pad(round)}</span>}</div>
      <table className="mt-3 w-full text-sm">
        <caption className="sr-only">Drivers&apos; championship standings</caption>
        <thead><tr className="stamp text-left text-[10px] text-subtle"><th scope="col" className="pb-2 font-bold">Pos</th><th scope="col" className="pb-2 font-bold">Driver</th><th scope="col" className="hidden pb-2 font-bold md:table-cell">Team</th><th scope="col" className="pb-2 text-right font-bold">Wins</th><th scope="col" className="pb-2 text-right font-bold">Pts</th></tr></thead>
        <tbody>{top.map((d) => <Row key={d.id} d={d} />)}</tbody>
      </table>
      {rest.length > 0 && (
        <details className="group mt-2">
          <summary className="stamp cursor-pointer list-none border-t-2 border-border py-2.5 text-[11px] text-muted hover:text-fg">All {rows.length} drivers <span className="inline-block transition-transform group-open:rotate-180" aria-hidden>▾</span></summary>
          <table className="w-full text-sm"><caption className="sr-only">Remaining drivers</caption><tbody>{rest.map((d) => <Row key={d.id} d={d} />)}</tbody></table>
        </details>
      )}
    </div>
  );
}

export function ConstructorStandings({ rows }: { rows: ConstructorStanding[] }) {
  const max = rows[0]?.points ?? 0;
  return (
    <div className="metal rounded-lg border-2 border-border-strong p-4 sm:p-6">
      <h3 className="text-lg uppercase">Constructors</h3>
      <ol className="mt-4 space-y-3.5 text-sm">
        {rows.map((t) => (
          <li key={t.teamId}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2"><span className="mono w-6 text-subtle">{pad(t.position)}</span><span className="h-4 w-1.5" style={{ background: t.colour }} aria-hidden /><span className="truncate uppercase">{t.name}</span><span className="mono hidden text-[11px] text-subtle sm:inline">{t.drivers.join("/")}</span></span>
              <span className="num">{t.points}</span>
            </div>
            <div className="mt-1.5 pl-8"><Bar value={t.points} max={max} colour={t.colour} /></div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Full calendar as a broken grid: the next race takes a big slab, the rest vary by state. */
export function CalendarGrid({ races }: { races: Race[] }) {
  return (
    <ol className="grid grid-flow-dense gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      {races.map((r, i) => {
        const w = r.podium[0];
        const hot = r.status === "next" || r.status === "live";
        const span = hot ? "sm:col-span-2 sm:row-span-2" : r.hasSprint && w ? "xl:col-span-2" : "";
        return (
          <li key={r.round} className={`rise ${span}`} style={{ ["--i" as string]: Math.min(i, 12) }}>
            <Link href={`/gp/${r.round}?season=${r.season}`}
              className={`distort relative flex h-full flex-col overflow-hidden rounded-lg border-2 p-4 ${hot ? "border-accent bg-accent text-bg shadow-[6px_6px_0_var(--color-blood)]" : r.status === "completed" ? "border-border-strong bg-surface shadow-[4px_4px_0_var(--color-cobalt)]" : "border-dashed border-border bg-bg"}`}>
              {w && <span className="absolute inset-y-0 right-0 w-1.5" style={{ background: w.colour }} aria-hidden />}
              <div className={`flex items-center justify-between ${hot ? "text-bg" : "text-subtle"}`}>
                <span className="mono text-xs font-bold">R{pad(r.round)}{r.hasSprint ? " · SPR" : ""}</span>
                <span className="stamp text-[10px]">{hot ? (r.status === "live" ? "Live" : "Next") : r.status === "completed" ? "Done" : new Date(r.start).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}</span>
              </div>
              {hot && <span className="mt-4 block text-[clamp(3rem,7vw,5.5rem)] uppercase leading-[0.85] tracking-tighter" aria-hidden>{r.locality}</span>}
              <span className={`mt-2 uppercase leading-tight ${hot ? "text-lg" : "text-sm"}`}>{r.name}</span>
              <span className={`mono text-xs ${hot ? "text-bg" : "text-muted"}`}>{r.locality}, {r.country}</span>
              <span className="mt-auto pt-3 text-xs">
                {w ? <span className="inline-flex items-center gap-1.5"><TrophyIcon className="h-3.5 w-3.5 text-accent" /><span>{w.code}</span><span className="mono text-muted">{w.team}</span></span>
                  : <span className={hot ? "text-bg" : "text-subtle"}><ZonedTime iso={r.start} /></span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
