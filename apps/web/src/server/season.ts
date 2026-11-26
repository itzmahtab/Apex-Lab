import "server-only";
import { z } from "zod";
import type { OpenF1Client } from "@apexlab/openf1";
import { env } from "@/env";
import { CIRCUITS, circuitTz, TEAM_FALLBACK } from "@/lib/circuits";
import { teamHex } from "@/lib/colors";
import { jolpicaClient, openF1Repository } from "./repository";

/*
 * Season hub data: calendar, winners, standings and points progression from Jolpica (Ergast successor),
 * live team colours from OpenF1. Every value is validated with Zod; any upstream failure degrades to
 * `null` so the page still renders (the globe falls back to the static circuit table).
 */

const DAY = 86400;
const slot = z.object({ date: z.string(), time: z.string().optional() });
const locationSchema = z.object({ lat: z.string(), long: z.string(), locality: z.string(), country: z.string() });
const circuitSchema = z.object({ circuitId: z.string(), circuitName: z.string(), Location: locationSchema });
const driverRef = z.object({
  driverId: z.string(), permanentNumber: z.string().optional(), code: z.string().optional(),
  givenName: z.string(), familyName: z.string(), nationality: z.string().optional(),
});
const constructorRef = z.object({ constructorId: z.string(), name: z.string() });
const timeRef = z.object({ millis: z.string().optional(), time: z.string() }).optional();
const resultRow = z.object({
  number: z.string().optional(), position: z.string(), positionText: z.string().optional(), points: z.string().optional(),
  Driver: driverRef, Constructor: constructorRef, grid: z.string().optional(), laps: z.string().optional(),
  status: z.string().optional(), Time: timeRef,
  FastestLap: z.object({ rank: z.string().optional(), lap: z.string().optional(), Time: z.object({ time: z.string() }).optional() }).optional(),
});
const qualiRow = z.object({
  position: z.string(), Driver: driverRef, Constructor: constructorRef,
  Q1: z.string().optional(), Q2: z.string().optional(), Q3: z.string().optional(),
});
const raceSchema = z.object({
  season: z.string(), round: z.string(), raceName: z.string(), Circuit: circuitSchema, date: z.string(), time: z.string().optional(),
  FirstPractice: slot.optional(), SecondPractice: slot.optional(), ThirdPractice: slot.optional(),
  Qualifying: slot.optional(), Sprint: slot.optional(), SprintQualifying: slot.optional(), SprintShootout: slot.optional(),
  Results: z.array(resultRow).optional(), SprintResults: z.array(resultRow).optional(), QualifyingResults: z.array(qualiRow).optional(),
});
const raceTable = z.object({ MRData: z.object({ total: z.string(), RaceTable: z.object({ season: z.string().optional(), Races: z.array(raceSchema) }) }) });
const driverStandings = z.object({ MRData: z.object({ StandingsTable: z.object({ season: z.string().optional(), round: z.string().optional(), StandingsLists: z.array(z.object({
  round: z.string(),
  DriverStandings: z.array(z.object({ position: z.string().optional(), positionText: z.string().optional(), points: z.string(), wins: z.string(), Driver: driverRef, Constructors: z.array(constructorRef) })),
})) }) }) });
const constructorStandings = z.object({ MRData: z.object({ StandingsTable: z.object({ StandingsLists: z.array(z.object({
  round: z.string(),
  ConstructorStandings: z.array(z.object({ position: z.string().optional(), positionText: z.string().optional(), points: z.string(), wins: z.string(), Constructor: constructorRef })),
})) }) }) });
type JRace = z.infer<typeof raceSchema>;

// ---------------- public shapes ----------------

export type SessionId = "fp1" | "fp2" | "fp3" | "sq" | "sprint" | "quali" | "race";
export interface SessionSlot { id: SessionId; label: string; start: string }
export interface DriverRef { id: string; code: string; name: string; number: string | null; team: string; teamId: string; colour: string }
export interface Race {
  season: number; round: number; name: string; circuitId: string; circuitName: string;
  locality: string; country: string; lat: number; lng: number; tz: string;
  start: string; sessions: SessionSlot[]; hasSprint: boolean;
  status: "completed" | "live" | "next" | "upcoming";
  podium: DriverRef[];
}
export interface DriverStanding extends DriverRef { position: number; points: number; wins: number; nationality: string | null }
export interface ConstructorStanding { position: number; teamId: string; name: string; points: number; wins: number; colour: string; drivers: string[] }
export interface Progression { rounds: { round: number; label: string }[]; series: { code: string; colour: string; dashed: boolean; points: number[] }[] }
export interface SeasonData {
  season: number; races: Race[]; nextRace: Race | null; lastRace: Race | null;
  drivers: DriverStanding[]; constructors: ConstructorStanding[]; standingsRound: number | null;
  progression: Progression | null;
}

const SESSION_LABEL: Record<SessionId, string> = {
  fp1: "Practice 1", fp2: "Practice 2", fp3: "Practice 3", sq: "Sprint Qualifying", sprint: "Sprint", quali: "Qualifying", race: "Race",
};
const iso = (s: { date: string; time?: string } | undefined) => (s ? `${s.date}T${s.time ?? "12:00:00Z"}` : null);
/** Typical session lengths, for deciding when a weekend is "live". */
const DURATION_MIN: Record<SessionId, number> = { fp1: 60, fp2: 60, fp3: 60, sq: 45, sprint: 60, quali: 60, race: 120 };
export const sessionEnd = (s: SessionSlot) => Date.parse(s.start) + DURATION_MIN[s.id] * 60_000;

function sessionsOf(r: JRace): SessionSlot[] {
  const list: [SessionId, string | null][] = [
    ["fp1", iso(r.FirstPractice)], ["fp2", iso(r.SecondPractice)], ["fp3", iso(r.ThirdPractice)],
    ["sq", iso(r.SprintQualifying ?? r.SprintShootout)], ["sprint", iso(r.Sprint)], ["quali", iso(r.Qualifying)],
    ["race", iso({ date: r.date, time: r.time })],
  ];
  return list.filter((x): x is [SessionId, string] => !!x[1])
    .map(([id, start]) => ({ id, label: SESSION_LABEL[id], start }))
    .sort((a, b) => a.start.localeCompare(b.start));
}

// ---------------- colours ----------------

/** Driver number → team colour from the latest OpenF1 session (real liveries change every season). */
async function liveColours(): Promise<Map<number, string>> {
  try {
    const rows = await (await openF1Repository()).latestDrivers();
    return new Map(rows.filter((d) => d.number != null && d.teamColour).map((d) => [d.number!, teamHex(d.teamColour, "#9aa4b2")]));
  } catch {
    return new Map();
  }
}

function makeRef(d: z.infer<typeof driverRef>, c: z.infer<typeof constructorRef>, colours: Map<number, string>): DriverRef {
  const n = d.permanentNumber ? Number(d.permanentNumber) : NaN;
  return {
    id: d.driverId, code: d.code ?? d.familyName.slice(0, 3).toUpperCase(), name: `${d.givenName} ${d.familyName}`,
    number: d.permanentNumber ?? null, team: c.name, teamId: c.constructorId,
    colour: colours.get(n) ?? TEAM_FALLBACK[c.constructorId] ?? "#9aa4b2",
  };
}

// ---------------- loaders ----------------

/** All result rows of a paginated Jolpica endpoint (limit is capped at 100 per page), merged by round. */
async function allPages(c: OpenF1Client, path: string, ttl: number): Promise<JRace[]> {
  const first = await c.get(path, { limit: 100, offset: 0 }, raceTable, ttl);
  const total = Number(first.MRData.total);
  const pages = [first];
  for (let off = 100; off < total && off < 1000; off += 100) pages.push(await c.get(path, { limit: 100, offset: off }, raceTable, ttl));
  const byRound = new Map<string, JRace>();
  for (const p of pages) for (const r of p.MRData.RaceTable.Races) {
    const prev = byRound.get(r.round);
    if (!prev) byRound.set(r.round, { ...r });
    else {
      prev.Results = [...(prev.Results ?? []), ...(r.Results ?? [])];
      prev.SprintResults = [...(prev.SprintResults ?? []), ...(r.SprintResults ?? [])];
    }
  }
  return [...byRound.values()];
}

export async function getSeason(seasonParam: number | "current" = "current"): Promise<SeasonData | null> {
  if (env().DATA_SOURCE === "fixture") return null; // offline/demo mode: no network
  try {
    const c = await jolpicaClient();
    // The current year and "current" are the same schedule; use one cache key for both.
    const s = seasonParam === new Date().getUTCFullYear() ? "current" : String(seasonParam);
    const [schedule, colours] = await Promise.all([c.get(`${s}.json`, {}, raceTable, 6 * 3600), liveColours()]);
    const season = Number(schedule.MRData.RaceTable.season ?? schedule.MRData.RaceTable.Races[0]?.season);
    const pastSeason = season < new Date().getUTCFullYear();
    const ttl = pastSeason ? 30 * DAY : 1800;
    const [results, sprints, ds, cs] = await Promise.all([
      allPages(c, `${season}/results.json`, ttl).catch((e) => { console.error("[apexlab] results", e); return [] as JRace[]; }),
      allPages(c, `${season}/sprint.json`, ttl).catch(() => [] as JRace[]),
      c.get(`${season}/driverstandings.json`, { limit: 100 }, driverStandings, ttl).catch((e) => { console.error("[apexlab] ds", e); return null; }),
      c.get(`${season}/constructorstandings.json`, { limit: 100 }, constructorStandings, ttl).catch(() => null),
    ]);
    const resByRound = new Map(results.map((r) => [Number(r.round), r]));
    const now = Date.now();

    let nextAssigned = false;
    const races: Race[] = schedule.MRData.RaceTable.Races.map((r) => {
      const sessions = sessionsOf(r);
      const lat = Number(r.Circuit.Location.lat), lng = Number(r.Circuit.Location.long);
      const res = resByRound.get(Number(r.round))?.Results ?? [];
      const podium = res.filter((x) => ["1", "2", "3"].includes(x.position)).sort((a, b) => Number(a.position) - Number(b.position))
        .map((x) => makeRef(x.Driver, x.Constructor, colours));
      const firstStart = Date.parse(sessions[0]?.start ?? r.date);
      const lastEnd = sessions.length ? sessionEnd(sessions.at(-1)!) : Date.parse(r.date);
      let status: Race["status"] = podium.length || lastEnd < now ? "completed" : firstStart <= now ? "live" : "upcoming";
      if (status === "live" || (status === "upcoming" && !nextAssigned)) { if (!nextAssigned) { nextAssigned = true; if (status === "upcoming") status = "next"; } }
      return {
        season, round: Number(r.round), name: r.raceName, circuitId: r.Circuit.circuitId, circuitName: r.Circuit.circuitName,
        locality: r.Circuit.Location.locality, country: r.Circuit.Location.country, lat, lng, tz: circuitTz(r.Circuit.circuitId, lng),
        start: iso({ date: r.date, time: r.time })!, sessions, hasSprint: sessions.some((x) => x.id === "sprint"), status, podium,
      };
    });

    const dl = ds?.MRData.StandingsTable.StandingsLists[0];
    const drivers: DriverStanding[] = (dl?.DriverStandings ?? []).map((d, i) => ({
      ...makeRef(d.Driver, d.Constructors.at(-1) ?? { constructorId: "unknown", name: "—" }, colours),
      position: Number(d.position ?? i + 1), points: Number(d.points), wins: Number(d.wins), nationality: d.Driver.nationality ?? null,
    }));
    const cl = cs?.MRData.StandingsTable.StandingsLists[0];
    const constructors: ConstructorStanding[] = (cl?.ConstructorStandings ?? []).map((t, i) => {
      const mine = drivers.filter((d) => d.teamId === t.Constructor.constructorId);
      return {
        position: Number(t.position ?? i + 1), teamId: t.Constructor.constructorId, name: t.Constructor.name,
        points: Number(t.points), wins: Number(t.wins),
        colour: mine[0]?.colour ?? TEAM_FALLBACK[t.Constructor.constructorId] ?? "#9aa4b2",
        drivers: mine.map((d) => d.code),
      };
    });

    return {
      season, races,
      nextRace: races.find((r) => r.status === "live" || r.status === "next") ?? null,
      lastRace: [...races].reverse().find((r) => r.podium.length > 0) ?? null,
      drivers, constructors, standingsRound: dl ? Number(dl.round) : null,
      progression: buildProgression(races, results, sprints, drivers),
    };
  } catch (e) {
    console.error("[apexlab] season", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Cumulative points (race + sprint, as awarded) for the current top six, round by round. */
function buildProgression(races: Race[], results: JRace[], sprints: JRace[], drivers: DriverStanding[]): Progression | null {
  const top = drivers.slice(0, 6);
  if (!top.length || !results.length) return null;
  const done = races.filter((r) => r.podium.length > 0);
  const pts = (rows: JRace[], round: number, id: string) =>
    Number(rows.find((r) => Number(r.round) === round)?.[rows === sprints ? "SprintResults" : "Results"]?.find((x) => x.Driver.driverId === id)?.points ?? 0);
  const seenTeam = new Set<string>();
  return {
    rounds: done.map((r) => ({ round: r.round, label: CIRCUITS[r.circuitId]?.country.slice(0, 3).toUpperCase() ?? `R${r.round}` })),
    series: top.map((d) => {
      let sum = 0;
      const dashed = seenTeam.has(d.teamId); seenTeam.add(d.teamId);
      return { code: d.code, colour: d.colour, dashed, points: done.map((r) => (sum += pts(results, r.round, d.id) + pts(sprints, r.round, d.id))) };
    }),
  };
}

// ---------------- a single Grand Prix ----------------

export interface ResultTable {
  id: SessionId; label: string; start: string; done: boolean; source: string;
  columns: string[];
  rows: { position: string; code: string; name: string; team: string; colour: string; values: string[]; highlight?: string }[];
}

const fmtLap = (s: number | null | undefined) => {
  if (s == null || !Number.isFinite(s)) return "—";
  const m = Math.floor(s / 60), r = s - m * 60;
  return m ? `${m}:${r.toFixed(3).padStart(6, "0")}` : r.toFixed(3);
};
const fmtGap = (g: string | null) => (g == null || g === "0" ? "" : /^[\d.]+$/.test(g) ? `+${Number(g).toFixed(3)}` : g);

export async function getGrandPrix(season: number, round: number): Promise<{ race: Race; tables: ResultTable[]; meetingKey: number | null; circuitKey: number | null } | null> {
  const data = await getSeason(season);
  const race = data?.races.find((r) => r.round === round);
  if (!data || !race) return null;
  const c = await jolpicaClient();
  const colours = new Map(data.drivers.map((d) => [d.id, d.colour]));
  const colourOf = (id: string, team: string) => colours.get(id) ?? TEAM_FALLBACK[team] ?? "#9aa4b2";
  const ttl = race.status === "completed" ? 7 * DAY : 600;
  const one = (path: string) => c.get(`${season}/${round}/${path}`, {}, raceTable, ttl).then((t) => t.MRData.RaceTable.Races[0] ?? null).catch(() => null);
  const of1 = await openF1Repository();
  const [jr, jq, js, meeting] = await Promise.all([one("results.json"), one("qualifying.json"), one("sprint.json"), of1.findMeeting(season, race.start).catch(() => null)]);
  const weekend = meeting ? await of1.getWeekendResults(meeting.meeting_key).catch(() => []) : [];
  const now = Date.now();

  const tables: ResultTable[] = race.sessions.map((sl) => {
    const base = { id: sl.id, label: sl.label, start: sl.start, done: sessionEnd(sl) < now };
    if (sl.id === "race" || sl.id === "sprint") {
      const rows = (sl.id === "race" ? jr?.Results : js?.SprintResults) ?? [];
      if (rows.length) {
        const fastest = rows.find((x) => x.FastestLap?.rank === "1");
        return {
          ...base, done: true, source: "Jolpica", columns: ["Grid", "Laps", "Time / status", "Pts"],
          rows: rows.map((x) => ({
            position: x.positionText && /^\d+$/.test(x.positionText) ? x.positionText : (x.positionText ?? x.position),
            code: x.Driver.code ?? x.Driver.familyName.slice(0, 3).toUpperCase(), name: `${x.Driver.givenName} ${x.Driver.familyName}`,
            team: x.Constructor.name, colour: colourOf(x.Driver.driverId, x.Constructor.constructorId),
            values: [x.grid === "0" ? "Pit" : (x.grid ?? "—"), x.laps ?? "—", x.Time?.time ?? x.status ?? "—", x.points ?? "0"],
            highlight: fastest === x ? `Fastest lap ${fastest.FastestLap?.Time?.time ?? ""}`.trim() : undefined,
          })),
        };
      }
    }
    if (sl.id === "quali" && jq?.QualifyingResults?.length) {
      return {
        ...base, done: true, source: "Jolpica", columns: ["Q1", "Q2", "Q3"],
        rows: jq.QualifyingResults.map((x) => ({
          position: x.position, code: x.Driver.code ?? x.Driver.familyName.slice(0, 3).toUpperCase(),
          name: `${x.Driver.givenName} ${x.Driver.familyName}`, team: x.Constructor.name,
          colour: colourOf(x.Driver.driverId, x.Constructor.constructorId), values: [x.Q1 ?? "—", x.Q2 ?? "—", x.Q3 ?? "—"],
        })),
      };
    }
    // Practice, sprint qualifying, and anything Jolpica lacks: OpenF1 session results.
    const name = { fp1: "Practice 1", fp2: "Practice 2", fp3: "Practice 3", sq: "Sprint Qualifying", sprint: "Sprint", quali: "Qualifying", race: "Race" }[sl.id];
    const w = weekend.find((x) => x.name === name || (sl.id === "sq" && /sprint (qualifying|shootout)/i.test(x.name)));
    const res = w?.results ?? [];
    const seg = res.some((r) => r.segments);
    const isRace = sl.id === "race" || sl.id === "sprint";
    return {
      ...base, done: base.done || res.length > 0, source: "OpenF1",
      columns: seg ? (sl.id === "sq" ? ["SQ1", "SQ2", "SQ3"] : ["Q1", "Q2", "Q3"]) : isRace ? ["Laps", "Gap"] : ["Best lap", "Gap", "Laps"],
      rows: res.map((r) => ({
        position: r.status ?? (r.position != null ? String(r.position) : "—"), code: r.abbreviation, name: r.name, team: r.team ?? "",
        colour: teamHex(r.teamColour, "#9aa4b2"),
        values: seg ? [0, 1, 2].map((i) => fmtLap(r.segments?.[i])) : isRace ? [String(r.laps ?? "—"), fmtGap(r.gap) || "Winner"] : [fmtLap(r.timeS), fmtGap(r.gap), String(r.laps ?? "—")],
      })),
    };
  });

  return { race, tables, meetingKey: meeting?.meeting_key ?? null, circuitKey: meeting?.circuit_key ?? null };
}

/** 3D circuit geometry for a round: resolves the OpenF1 circuit, then its most recent fast lap there. */
export async function getTrackForRound(season: number, round: number) {
  if (env().DATA_SOURCE === "fixture") return null;
  // Only the race date is needed: one cached schedule call, not the whole season build.
  const c = await jolpicaClient();
  const sched = await c.get(`${season}.json`, {}, raceTable, 6 * 3600).catch((e) => { console.error("[apexlab] track schedule", e instanceof Error ? e.message : e); return null; });
  const r = sched?.MRData.RaceTable.Races.find((x) => Number(x.round) === round);
  if (!r) return null;
  const of1 = await openF1Repository();
  const meeting = await of1.findMeeting(season, iso({ date: r.date, time: r.time })!).catch(() => null);
  if (!meeting?.circuit_key) return null;
  return of1.getCircuitTrack(meeting.circuit_key).catch((e) => { console.error("[apexlab] track", e instanceof Error ? e.message : e); return null; });
}
