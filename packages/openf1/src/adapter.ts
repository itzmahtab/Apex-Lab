import {
  ARTIFACT_SCHEMA_VERSION,
  type Driver, type EventSummary, type LapSummary, type SessionDetail, type SessionSummary, type Stint, type TelemetryArtifact,
} from "@apexlab/contracts";
import { normalizeLap } from "@apexlab/analytics";
import { OpenF1Client } from "./client";
import {
  carDataSchema, driverSchema, lapSchema, locationSchema, meetingSchema, sessionResultSchema, sessionSchema, stintSchema,
  type Meeting, type OF1Driver, type OF1Lap, type OF1Session, type OF1Stint,
} from "./schemas";

export const OPENF1_FIRST_SEASON = 2023;
export const OPENF1_SOURCE = {
  name: "openf1",
  rightsStatus: "unverified" as const,
  attribution: "Timing and telemetry from OpenF1 (openf1.org), an unofficial community API. Not affiliated with Formula 1.",
};

const DAY = 86400;
const ms = (s: number | null | undefined) => (s == null ? null : Math.round(s * 1000));

export function sessionStatus(start: string | null, end: string | null, now = Date.now()): SessionSummary["status"] {
  if (end && Date.parse(end) < now) return "completed";
  if (start && Date.parse(start) <= now) return "live";
  return "upcoming";
}
/** Completed sessions never change, so they can be cached for a long time. */
const ttlFor = (end: string | null | undefined) => (end && Date.parse(end) < Date.now() - 2 * 3600_000 ? 30 * DAY : 120);

export function toEvent(m: Meeting): EventSummary {
  return {
    key: String(m.meeting_key), year: m.year, name: m.meeting_name,
    officialName: m.meeting_official_name ?? null, countryName: m.country_name ?? null, countryCode: m.country_code ?? null,
    circuitName: m.circuit_short_name ?? null, location: m.location ?? null,
    startDate: m.date_start ?? null, endDate: m.date_end ?? null,
    isTesting: /testing/i.test(m.meeting_name),
  };
}

export function toSession(s: OF1Session): SessionSummary {
  return {
    key: String(s.session_key), eventKey: String(s.meeting_key), name: s.session_name, sessionType: s.session_type,
    startDate: s.date_start, endDate: s.date_end, status: sessionStatus(s.date_start, s.date_end),
  };
}

export function toDrivers(rows: OF1Driver[]): Driver[] {
  const seen = new Map<number, Driver>();
  for (const d of rows) {
    if (seen.has(d.driver_number)) continue;
    const colour = d.team_colour && /^[0-9a-fA-F]{6}$/.test(d.team_colour) ? d.team_colour.toUpperCase() : null;
    seen.set(d.driver_number, {
      key: String(d.driver_number), number: d.driver_number,
      abbreviation: d.name_acronym ?? `#${d.driver_number}`,
      displayName: d.first_name && d.last_name ? `${d.first_name} ${d.last_name}` : (d.full_name ?? `Car ${d.driver_number}`),
      teamName: d.team_name, teamColour: colour,
    });
  }
  return [...seen.values()].sort((a, b) => (a.teamName ?? "").localeCompare(b.teamName ?? "") || (a.number ?? 0) - (b.number ?? 0));
}

export function compoundForLap(stints: OF1Stint[], driver: number, lap: number): string | null {
  const s = stints.find((x) => x.driver_number === driver && x.lap_start != null && x.lap_end != null && lap >= x.lap_start && lap <= x.lap_end);
  return s?.compound ?? null;
}

export function toLaps(laps: OF1Lap[], stints: OF1Stint[]): LapSummary[] {
  return laps
    .filter((l) => l.lap_number > 0)
    .map((l) => ({
      driverKey: String(l.driver_number), lapNumber: l.lap_number,
      lapTimeMs: ms(l.lap_duration),
      sector1Ms: ms(l.duration_sector_1), sector2Ms: ms(l.duration_sector_2), sector3Ms: ms(l.duration_sector_3),
      compound: compoundForLap(stints, l.driver_number, l.lap_number),
      isValid: null, // OpenF1 does not publish deleted (track-limits) laps
      hasTelemetry: l.lap_duration != null && l.date_start != null,
      isPitOutLap: l.is_pit_out_lap,
    }))
    .filter((l) => l.lapTimeMs == null || l.lapTimeMs > 0);
}

export const toStints = (rows: OF1Stint[]): Stint[] =>
  rows.map((s) => ({
    driverKey: String(s.driver_number), stintNumber: s.stint_number, lapStart: s.lap_start, lapEnd: s.lap_end,
    compound: s.compound, tyreAgeAtStart: s.tyre_age_at_start,
  }));

export class OpenF1Repository {
  constructor(private c: OpenF1Client) {}

  listSeasons(now = new Date()): number[] {
    const out: number[] = [];
    for (let y = now.getUTCFullYear(); y >= OPENF1_FIRST_SEASON; y--) out.push(y);
    return out;
  }

  async listEvents(year: number): Promise<EventSummary[]> {
    const rows = await this.c.list("meetings", { year }, meetingSchema, year < new Date().getUTCFullYear() ? 30 * DAY : 3600);
    return rows.filter((m) => !m.is_cancelled).map(toEvent).sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""));
  }

  async getEvent(eventKey: string): Promise<{ event: EventSummary; sessions: SessionSummary[] } | null> {
    const k = Number(eventKey);
    if (!Number.isInteger(k)) return null;
    const [meetings, sessions] = await Promise.all([
      this.c.list("meetings", { meeting_key: k }, meetingSchema, DAY),
      this.c.list("sessions", { meeting_key: k }, sessionSchema, 3600),
    ]);
    const m = meetings[0];
    if (!m) return null;
    return {
      event: toEvent(m),
      sessions: sessions.filter((s) => !s.is_cancelled).map(toSession).sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? "")),
    };
  }

  /** Most recent completed session with this name (e.g. "Qualifying") in a season. */
  async latestSession(year: number, sessionName: string): Promise<SessionSummary | null> {
    const rows = await this.c.list("sessions", { year, session_name: sessionName }, sessionSchema, 3600);
    const done = rows.filter((s) => !s.is_cancelled).map(toSession).filter((s) => s.status === "completed");
    return done.sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? "")).at(-1) ?? null;
  }

  private async sessionRow(sessionKey: string) {
    const k = Number(sessionKey);
    if (!Number.isInteger(k)) return null;
    return (await this.c.list("sessions", { session_key: k }, sessionSchema, DAY))[0] ?? null;
  }

  async getSession(sessionKey: string): Promise<SessionDetail | null> {
    const s = await this.sessionRow(sessionKey);
    if (!s) return null;
    const ttl = ttlFor(s.date_end);
    const [meetings, drivers, laps, stints] = await Promise.all([
      this.c.list("meetings", { meeting_key: s.meeting_key }, meetingSchema, DAY),
      this.c.list("drivers", { session_key: s.session_key }, driverSchema, ttl),
      this.c.list("laps", { session_key: s.session_key }, lapSchema, ttl),
      this.c.list("stints", { session_key: s.session_key }, stintSchema, ttl),
    ]);
    const m = meetings[0];
    if (!m) return null;
    return {
      session: toSession(s), event: toEvent(m), drivers: toDrivers(drivers),
      laps: toLaps(laps, stints), stints: toStints(stints), source: OPENF1_SOURCE,
    };
  }

  /** Fetches and normalises one lap. Returns null if the lap or its telemetry does not exist. */
  async getLapTelemetry(sessionKey: string, driverKey: string, lapNumber: number, opts: { withTrack?: boolean } = {}): Promise<TelemetryArtifact | null> {
    const s = await this.sessionRow(sessionKey);
    const drv = Number(driverKey);
    if (!s || !Number.isInteger(drv)) return null;
    const ttl = ttlFor(s.date_end);
    // Reuse the session-wide laps response (already cached by getSession) instead of a per-lap request.
    const lap = (await this.c.list("laps", { session_key: s.session_key }, lapSchema, ttl))
      .find((l) => l.driver_number === drv && l.lap_number === lapNumber);
    if (!lap?.date_start || lap.lap_duration == null) return null;
    const t0 = Date.parse(lap.date_start);
    const dur = lap.lap_duration;
    // 1.5 s margin either side so the lap boundaries can be interpolated, not guessed.
    const from = new Date(t0 - 1500).toISOString(), to = new Date(t0 + dur * 1000 + 1500).toISOString();
    const [car, loc, drivers] = await Promise.all([
      this.c.list("car_data", { session_key: s.session_key, driver_number: drv, "date>": from, "date<": to }, carDataSchema, ttl),
      opts.withTrack === false ? Promise.resolve([]) : this.c.list("location", { session_key: s.session_key, driver_number: drv, "date>": from, "date<": to }, locationSchema, ttl),
      this.c.list("drivers", { session_key: s.session_key }, driverSchema, ttl),
    ]);
    const samples = normalizeLap(
      car.map((r) => ({
        t: (Date.parse(r.date) - t0) / 1000,
        speedKph: r.speed, throttlePct: r.throttle, brakePct: r.brake,
        gear: r.n_gear == null ? null : Math.max(0, Math.min(9, r.n_gear)),
        rpm: r.rpm, drs: r.drs == null ? null : r.drs >= 10,
      })),
      dur,
    );
    if (samples.length < 2) return null;
    const track = loc
      .filter((p) => p.x != null && p.y != null && !(p.x === 0 && p.y === 0))
      .map((p) => ({ timeS: (Date.parse(p.date) - t0) / 1000, x: p.x!, y: p.y! }))
      .filter((p) => p.timeS >= 0 && p.timeS <= dur);
    const d = drivers.find((x) => x.driver_number === drv);
    return {
      schemaVersion: ARTIFACT_SCHEMA_VERSION,
      source: { name: OPENF1_SOURCE.name, retrievedAt: new Date().toISOString(), rightsStatus: OPENF1_SOURCE.rightsStatus, notes: OPENF1_SOURCE.attribution },
      session: { season: s.year, eventKey: String(s.meeting_key), sessionKey: String(s.session_key) },
      driver: { key: String(drv), abbreviation: d?.name_acronym ?? `#${drv}` },
      lap: {
        number: lapNumber, lapTimeMs: ms(dur), sector1Ms: ms(lap.duration_sector_1), sector2Ms: ms(lap.duration_sector_2),
        sector3Ms: ms(lap.duration_sector_3), isValid: null,
      },
      units: { distance: "m", speed: "km/h", throttle: "percent", brake: "boolean", time: "seconds-from-lap-start" },
      samples,
      track: track.length >= 10 ? track : undefined,
    };
  }

  /** Drivers (with current team colours) of the most recent session OpenF1 knows about. */
  async latestDrivers() {
    return toDrivers(await this.c.list("drivers", { session_key: "latest" }, driverSchema, 6 * 3600));
  }

  /** Raw access for endpoints without a dedicated adapter method (live/last-session dashboard). */
  get client(): OpenF1Client { return this.c; }

  /** The meeting (Grand Prix weekend) in `year` whose dates contain `isoDate` (a race day), if OpenF1 has it. */
  async findMeeting(year: number, isoDate: string): Promise<Meeting | null> {
    // `circuit_key>0` matches every meeting but gives a distinct cache key: older cache entries for
    // `meetings?year=` were stored with a schema that stripped circuit_key.
    const rows = await this.c.list("meetings", { year, "circuit_key>": 0 }, meetingSchema, year < new Date().getUTCFullYear() ? 30 * DAY : 3600);
    const t = Date.parse(isoDate);
    return rows.find((m) => !m.is_cancelled && m.date_start && m.date_end
      && Date.parse(m.date_start) - DAY * 1000 <= t && t <= Date.parse(m.date_end) + DAY * 1000) ?? null;
  }

  /** Every session of a weekend with its classification (empty for sessions not yet run). */
  async getWeekendResults(meetingKey: number): Promise<WeekendSession[]> {
    const sessions = (await this.c.list("sessions", { meeting_key: meetingKey }, sessionSchema, 600))
      .filter((s) => !s.is_cancelled)
      .sort((a, b) => (a.date_start ?? "").localeCompare(b.date_start ?? ""));
    return Promise.all(sessions.map(async (s) => {
      const summary = toSession(s);
      if (summary.status === "upcoming") return { ...summary, results: [] };
      const ttl = ttlFor(s.date_end);
      const [rows, drivers] = await Promise.all([
        this.c.list("session_result", { session_key: s.session_key }, sessionResultSchema, ttl),
        this.c.list("drivers", { session_key: s.session_key }, driverSchema, ttl),
      ]);
      const byNum = new Map(toDrivers(drivers).map((d) => [d.number, d]));
      const results: WeekendResult[] = rows
        .slice()
        .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
        .map((r) => {
          const d = byNum.get(r.driver_number);
          const dur = r.duration;
          const best = Array.isArray(dur) ? [...dur].reverse().find((x) => x != null) ?? null : dur ?? null;
          const gap = Array.isArray(r.gap_to_leader) ? [...r.gap_to_leader].reverse().find((x) => x != null) ?? null : r.gap_to_leader ?? null;
          return {
            position: r.position, number: r.driver_number,
            abbreviation: d?.abbreviation ?? `#${r.driver_number}`, name: d?.displayName ?? `Car ${r.driver_number}`,
            team: d?.teamName ?? null, teamColour: d?.teamColour ?? null,
            laps: r.number_of_laps ?? null, timeS: best, gap: gap == null ? null : String(gap),
            segments: Array.isArray(dur) ? dur : null,
            status: r.dsq ? "DSQ" : r.dns ? "DNS" : r.dnf ? "DNF" : null,
          };
        });
      return { ...summary, results };
    }));
  }

  /**
   * Circuit geometry for a 3D view: the fastest lap of the most recent completed qualifying (or race)
   * at this circuit, as timed x/y/z car positions. OpenF1 positions are in decimetres-ish track units.
   */
  async getCircuitTrack(circuitKey: number): Promise<CircuitTrack | null> {
    for (const name of ["Qualifying", "Race"]) {
      const sessions = (await this.c.list("sessions", { circuit_key: circuitKey, session_name: name }, sessionSchema, DAY))
        .filter((s) => !s.is_cancelled && s.year >= OPENF1_FIRST_SEASON && sessionStatus(s.date_start, s.date_end) === "completed")
        .sort((a, b) => (b.date_start ?? "").localeCompare(a.date_start ?? ""));
      for (const s of sessions.slice(0, 2)) {
        const ttl = ttlFor(s.date_end);
        const laps = (await this.c.list("laps", { session_key: s.session_key }, lapSchema, ttl))
          .filter((l) => l.lap_duration != null && l.date_start != null && !l.is_pit_out_lap)
          .sort((a, b) => a.lap_duration! - b.lap_duration!);
        const lap = laps[0];
        if (!lap) continue;
        const t0 = Date.parse(lap.date_start!), dur = lap.lap_duration!;
        const from = new Date(t0 - 1000).toISOString(), to = new Date(t0 + dur * 1000 + 1000).toISOString();
        const [loc, drivers] = await Promise.all([
          this.c.list("location", { session_key: s.session_key, driver_number: lap.driver_number, "date>": from, "date<": to }, locationSchema, ttl),
          this.c.list("drivers", { session_key: s.session_key }, driverSchema, ttl),
        ]);
        const points = loc
          .filter((p) => p.x != null && p.y != null && !(p.x === 0 && p.y === 0))
          .map((p) => ({ t: (Date.parse(p.date) - t0) / 1000, x: p.x!, y: p.y!, z: p.z ?? 0 }))
          .filter((p) => p.t >= 0 && p.t <= dur);
        if (points.length < 30) continue;
        const d = toDrivers(drivers).find((x) => x.number === lap.driver_number);
        return {
          year: s.year, sessionName: s.session_name, sessionKey: String(s.session_key), lapTimeS: dur,
          driver: d?.abbreviation ?? `#${lap.driver_number}`, driverName: d?.displayName ?? null, teamColour: d?.teamColour ?? null,
          points,
        };
      }
    }
    return null;
  }
}

export interface WeekendResult {
  position: number | null; number: number; abbreviation: string; name: string;
  team: string | null; teamColour: string | null;
  laps: number | null;
  /** Best lap (practice / last qualifying segment reached) or total race time, seconds. */
  timeS: number | null;
  gap: string | null;
  /** Q1/Q2/Q3 times for qualifying-type sessions. */
  segments: (number | null)[] | null;
  status: "DNF" | "DNS" | "DSQ" | null;
}
export type WeekendSession = SessionSummary & { results: WeekendResult[] };
export interface CircuitTrack {
  year: number; sessionName: string; sessionKey: string; lapTimeS: number;
  driver: string; driverName: string | null; teamColour: string | null;
  points: { t: number; x: number; y: number; z: number }[];
}
