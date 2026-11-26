import "server-only";
import { z } from "zod";
import { driverSchema, sessionResultSchema, sessionSchema, stintSchema } from "@apexlab/openf1";
import { env } from "@/env";
import { teamHex } from "@/lib/colors";
import { openF1Repository } from "./repository";

/*
 * Live session dashboard data.
 * 1. LIVETIMING_API_URL set → a self-hosted julesr0y/f1-livetiming-api instance (it holds the SignalR
 *    connection to F1's live timing feed; we poll its REST routes). This is the only truly live source.
 * 2. Otherwise, or if it is down → the most recent session from OpenF1, clearly labelled "not live".
 */

export interface LiveRow {
  position: number | null; number: string; code: string; name: string; team: string; colour: string;
  gap: string; interval: string; best: string; bestIsOverall: boolean; last: string;
  sectors: { value: string; overall: boolean; personal: boolean }[];
  inPit: boolean; retired: boolean; pits: number | null;
  tyre: { compound: string; laps: number | null; fresh: boolean | null } | null;
}
export interface LiveSnapshot {
  mode: "live" | "last-session";
  source: string;
  connected: boolean;
  session: { meeting: string; name: string; type: string; start: string | null; end: string | null };
  lap: { current: number; total: number | null } | null;
  rows: LiveRow[];
  weather: { air: number | null; track: number | null; humidity: number | null; wind: number | null; rain: boolean } | null;
  raceControl: { time: string | null; category: string; flag: string | null; message: string; lap: number | null }[];
  fetchedAt: string;
}

// ---------------- 1. self-hosted live timing ----------------

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : isObj(v) && "Value" in v ? str(v.Value) : "");
const numOrNull = (v: unknown) => { const n = Number(str(v)); return str(v) !== "" && Number.isFinite(n) ? n : null; };
/** F1's feed sends some collections as arrays and some as {"0": …, "1": …}. */
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : isObj(v) ? Object.keys(v).sort((a, b) => Number(a) - Number(b)).map((k) => v[k]) : []);

async function getJson(base: string, path: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch(`${base}${path}`, { signal: ctrl.signal, headers: { accept: "application/json" }, cache: "no-store" });
    if (!r.ok) throw new Error(`${path} → ${r.status}`);
    return await r.json();
  } finally { clearTimeout(t); }
}

async function fromLiveTiming(base: string): Promise<LiveSnapshot> {
  const [status, session, standings, tyres, lapCount, weather, rc] = await Promise.all([
    getJson(base, "/api/status"), getJson(base, "/api/session").catch(() => ({})), getJson(base, "/api/standings"),
    getJson(base, "/api/tyres").catch(() => ({})), getJson(base, "/api/lap-count").catch(() => ({})),
    getJson(base, "/api/weather").catch(() => ({})), getJson(base, "/api/race-control").catch(() => ({})),
  ]);
  const st = isObj(status) ? status : {};
  const lines = isObj(standings) && isObj(standings.Lines) ? standings.Lines : {};
  const tyreLines = isObj(tyres) && isObj(tyres.Lines) ? tyres.Lines : {};
  const rows: LiveRow[] = Object.entries(lines).map(([num, raw]) => {
    const l = isObj(raw) ? raw : {};
    const best = isObj(l.BestLapTime) ? l.BestLapTime : {};
    const tl = isObj(tyreLines[num]) ? (tyreLines[num] as Obj) : {};
    const stint = list(tl.Stints).at(-1);
    const s = isObj(stint) ? stint : null;
    return {
      position: numOrNull(l.Position), number: num, code: str(l.Tla) || num, name: str(l.FullName) || str(l.BroadcastName),
      team: str(l.TeamName), colour: teamHex(str(l.TeamColour) || str(tl.TeamColour), "#9aa4b2"),
      gap: str(l.GapToLeader) || (numOrNull(l.Position) === 1 ? "Leader" : ""), interval: str(l.IntervalToPositionAhead),
      best: str(best.Value), bestIsOverall: best.OverallFastest === true, last: str(l.LastLapTime),
      sectors: list(l.Sectors).map((x) => { const o = isObj(x) ? x : {}; return { value: str(o.Value), overall: o.OverallFastest === true, personal: o.PersonalFastest === true }; }),
      inPit: l.InPit === true, retired: l.Retired === true || l.Stopped === true, pits: numOrNull(l.NumberOfPitStops),
      tyre: s ? { compound: str(s.Compound).toUpperCase(), laps: numOrNull(s.TotalLaps), fresh: typeof s.New === "boolean" ? s.New : s.New === "true" ? true : s.New === "false" ? false : null } : null,
    };
  }).sort((a, b) => (a.position ?? 99) - (b.position ?? 99));

  const sess = isObj(session) && isObj(session.Session) ? session.Session : {};
  const meeting = isObj(sess.Meeting) ? sess.Meeting : {};
  const lc = isObj(lapCount) && isObj(lapCount.LapCount) ? lapCount.LapCount : {};
  const w = isObj(weather) && isObj(weather.Weather) ? weather.Weather : null;
  const msgs = isObj(rc) ? list(rc.RaceControl) : [];
  return {
    mode: "live", source: "F1 live timing (self-hosted f1-livetiming-api)", connected: st.isConnected === true,
    session: { meeting: str(meeting.Name) || "Live session", name: str(sess.Name) || "Session", type: str(sess.Type), start: str(sess.StartDate) || null, end: str(sess.EndDate) || null },
    lap: numOrNull(lc.CurrentLap) != null ? { current: numOrNull(lc.CurrentLap)!, total: numOrNull(lc.TotalLaps) } : null,
    rows,
    weather: w ? { air: numOrNull(w.AirTemp), track: numOrNull(w.TrackTemp), humidity: numOrNull(w.Humidity), wind: numOrNull(w.WindSpeed), rain: str(w.Rainfall) === "1" } : null,
    raceControl: msgs.slice(-40).reverse().map((m) => { const o = isObj(m) ? m : {}; const utc = str(o.Utc); return { time: utc ? (/[zZ]|[+-]\d\d:?\d\d$/.test(utc) ? utc : `${utc}Z`) : null, category: str(o.Category), flag: str(o.Flag) || null, message: str(o.Message), lap: numOrNull(o.Lap) }; }),
    fetchedAt: new Date().toISOString(),
  };
}

// ---------------- 2. OpenF1 last session ----------------

const weatherSchema = z.object({ date: z.string(), air_temperature: z.number().nullable(), track_temperature: z.number().nullable(), humidity: z.number().nullable(), wind_speed: z.number().nullable(), rainfall: z.number().nullable() });
const rcSchema = z.object({ date: z.string(), category: z.string().nullable(), flag: z.string().nullable(), message: z.string(), lap_number: z.number().nullable().optional() });
const fmt = (s: number | null | undefined) => (s == null ? "" : s >= 60 ? `${Math.floor(s / 60)}:${(s % 60).toFixed(3).padStart(6, "0")}` : s.toFixed(3));

async function fromOpenF1(): Promise<LiveSnapshot> {
  const c = (await openF1Repository()).client;
  const [session] = await c.list("sessions", { session_key: "latest" }, sessionSchema, 120);
  if (!session) throw new Error("no session");
  const k = session.session_key;
  const done = session.date_end ? Date.parse(session.date_end) < Date.now() : false;
  const ttl = done ? 3600 : 60;
  const [results, drivers, stints, weather, rc, meetings] = await Promise.all([
    c.list("session_result", { session_key: k }, sessionResultSchema, ttl),
    c.list("drivers", { session_key: k }, driverSchema, ttl),
    c.list("stints", { session_key: k }, stintSchema, ttl),
    c.list("weather", { session_key: k }, weatherSchema, ttl).catch(() => []),
    c.list("race_control", { session_key: k }, rcSchema, ttl).catch(() => []),
    c.list("meetings", { meeting_key: session.meeting_key }, z.object({ meeting_name: z.string() }), 86400).catch(() => []),
  ]);
  const byNum = new Map(drivers.map((d) => [d.driver_number, d]));
  const bestOverall = Math.min(...results.map((r) => (typeof r.duration === "number" ? r.duration : Infinity)));
  const rows: LiveRow[] = results.slice().sort((a, b) => (a.position ?? 99) - (b.position ?? 99)).map((r) => {
    const d = byNum.get(r.driver_number);
    const st = stints.filter((s) => s.driver_number === r.driver_number).sort((a, b) => a.stint_number - b.stint_number);
    const last = st.at(-1);
    const dur = Array.isArray(r.duration) ? [...r.duration].reverse().find((x) => x != null) ?? null : r.duration ?? null;
    const gapRaw = Array.isArray(r.gap_to_leader) ? [...r.gap_to_leader].reverse().find((x) => x != null) ?? null : r.gap_to_leader ?? null;
    const isRace = /race|sprint$/i.test(session.session_type) && !/qualifying/i.test(session.session_name);
    return {
      position: r.position, number: String(r.driver_number), code: d?.name_acronym ?? String(r.driver_number), name: d?.full_name ?? "",
      team: d?.team_name ?? "", colour: teamHex(d?.team_colour, "#9aa4b2"),
      gap: gapRaw == null || gapRaw === 0 ? (r.position === 1 ? (isRace ? "Leader" : "") : "") : typeof gapRaw === "number" ? `+${gapRaw.toFixed(3)}` : String(gapRaw),
      interval: "", best: isRace ? "" : fmt(dur), bestIsOverall: !isRace && dur === bestOverall, last: "",
      sectors: [], inPit: false, retired: !!(r.dnf || r.dns || r.dsq), pits: st.length ? st.length - 1 : null,
      tyre: last ? { compound: (last.compound ?? "").toUpperCase(), laps: last.lap_end != null && last.lap_start != null ? last.lap_end - last.lap_start + 1 + (last.tyre_age_at_start ?? 0) : null, fresh: last.tyre_age_at_start === 0 } : null,
    };
  });
  const w = weather.at(-1);
  const maxLap = Math.max(0, ...results.map((r) => r.number_of_laps ?? 0));
  return {
    mode: "last-session", source: "OpenF1 (most recent session, not live)", connected: false,
    session: { meeting: meetings[0]?.meeting_name ?? session.location ?? "", name: session.session_name, type: session.session_type, start: session.date_start, end: session.date_end },
    lap: maxLap ? { current: maxLap, total: maxLap } : null,
    rows,
    weather: w ? { air: w.air_temperature, track: w.track_temperature, humidity: w.humidity, wind: w.wind_speed, rain: (w.rainfall ?? 0) > 0 } : null,
    raceControl: rc.slice(-40).reverse().map((m) => ({ time: m.date, category: m.category ?? "", flag: m.flag, message: m.message, lap: m.lap_number ?? null })),
    fetchedAt: new Date().toISOString(),
  };
}

export async function getLiveSnapshot(): Promise<LiveSnapshot | null> {
  if (env().DATA_SOURCE === "fixture") return null;
  const base = env().LIVETIMING_API_URL?.replace(/\/$/, "");
  if (base) {
    try {
      const snap = await fromLiveTiming(base);
      if (snap.rows.length) return snap;
    } catch (e) {
      console.error("[apexlab] livetiming", e instanceof Error ? e.message : e);
    }
  }
  try { return await fromOpenF1(); } catch (e) {
    console.error("[apexlab] live fallback", e instanceof Error ? e.message : e);
    return null;
  }
}
