import "server-only";
import {
  CALCULATION_VERSION, comparisonQuerySchema, keySchema,
  type ComparisonQuery, type ComparisonResult, type LapSummary, type SessionDetail,
} from "@apexlab/contracts";
import {
  METHODOLOGY, alignByDistance, deterministicSummary, lapDeltaMs, lapLength, miniSectors, missingSignals, sectorDeltasMs, trackMap,
} from "@apexlab/analytics";
import { AppError } from "./errors";
import { getRepository } from "./repository";

export function parseQuery(input: Record<string, unknown>): ComparisonQuery {
  const r = comparisonQuerySchema.safeParse(input);
  if (!r.success) throw new AppError("VALIDATION_ERROR", r.error.issues.map((i) => `${i.path.join(".") || "query"}: ${i.message}`).join("; "));
  return r.data;
}

export async function loadSession(sessionKey: unknown): Promise<SessionDetail> {
  const k = keySchema.safeParse(sessionKey);
  if (!k.success) throw new AppError("VALIDATION_ERROR", "Invalid session.");
  const s = await getRepository().getSession(k.data);
  if (!s) throw new AppError("NOT_FOUND", "Unknown session.");
  return s;
}

/** A lap is a sensible default if it has a time and telemetry and is not an out-lap. */
const usable = (l: LapSummary) => l.lapTimeMs != null && l.hasTelemetry && l.isPitOutLap !== true && l.isValid !== false;

export function fastestLap(s: SessionDetail, driverKey: string): LapSummary | undefined {
  return s.laps.filter((l) => l.driverKey === driverKey && usable(l)).sort((a, b) => a.lapTimeMs! - b.lapTimeMs!)[0];
}

/** Fastest lap per driver, fastest first. Drivers without a usable lap are listed last. */
export function leaderboard(s: SessionDetail) {
  const rows = s.drivers.map((d) => ({ driver: d, lap: fastestLap(s, d.key) ?? null }));
  const timed = rows.filter((r) => r.lap).sort((a, b) => a.lap!.lapTimeMs! - b.lap!.lapTimeMs!);
  return [...timed, ...rows.filter((r) => !r.lap)];
}

/** Fill in whatever is missing from a partial selection: top-2 drivers by fastest lap, each driver's fastest lap. */
export function completeSelection(s: SessionDetail, q: { a?: string; b?: string; la?: number; lb?: number }): ComparisonQuery | null {
  const board = leaderboard(s).filter((r) => r.lap);
  const a = q.a && s.drivers.some((d) => d.key === q.a) ? q.a : board[0]?.driver.key;
  const b = q.b && q.b !== a && s.drivers.some((d) => d.key === q.b) ? q.b : board.find((r) => r.driver.key !== a)?.driver.key;
  if (!a || !b) return null;
  const la = q.la && s.laps.some((l) => l.driverKey === a && l.lapNumber === q.la) ? q.la : fastestLap(s, a)?.lapNumber;
  const lb = q.lb && s.laps.some((l) => l.driverKey === b && l.lapNumber === q.lb) ? q.lb : fastestLap(s, b)?.lapNumber;
  return la && lb ? { session: s.session.key, a, la, b, lb } : null;
}

export async function buildComparison(input: Record<string, unknown>): Promise<ComparisonResult> {
  const q = parseQuery(input);
  const s = await loadSession(q.session);
  const driver = (k: string) => {
    const d = s.drivers.find((x) => x.key === k);
    if (!d) throw new AppError("VALIDATION_ERROR", `Driver "${k}" did not take part in this session.`);
    return d;
  };
  const lap = (k: string, n: number) => {
    const l = s.laps.find((x) => x.driverKey === k && x.lapNumber === n);
    if (!l) throw new AppError("VALIDATION_ERROR", `Lap ${n} does not exist for car ${k}.`);
    return l;
  };
  const dA = driver(q.a), dB = driver(q.b), lA = lap(q.a, q.la), lB = lap(q.b, q.lb);

  const repo = getRepository();
  const [artA, artB] = await Promise.all([
    lA.hasTelemetry ? repo.getLapTelemetry(q.session, q.a, q.la) : null,
    // The track outline only needs one lap's positions; skipping B's saves an upstream call.
    lB.hasTelemetry ? repo.getLapTelemetry(q.session, q.b, q.lb, { withTrack: !lA.hasTelemetry }) : null,
  ]);

  const sectorsA: [number | null, number | null, number | null] = [lA.sector1Ms, lA.sector2Ms, lA.sector3Ms];
  const sectorsB: [number | null, number | null, number | null] = [lB.sector1Ms, lB.sector2Ms, lB.sector3Ms];
  const delta = lapDeltaMs(lA.lapTimeMs, lB.lapTimeMs);
  const sd = sectorDeltasMs(sectorsA, sectorsB);

  const warnings: string[] = [];
  const missing = new Set<string>();
  let points: ComparisonResult["points"] = [];
  let brakeKind: "percent" | "boolean" = "percent";
  let length: number | null = null;
  let sectors: ComparisonResult["miniSectors"] = [];
  let track: ComparisonResult["track"] = null;
  if (artA && artB) {
    if (artA.units.brake !== artB.units.brake) {
      warnings.push("The two laps report brake data in different forms, so the brake chart is hidden.");
      missing.add("brake");
    } else brakeKind = artA.units.brake;
    points = alignByDistance(artA, artB, { normalizeLength: true });
    length = Math.round(lapLength(artA, artB, true));
    sectors = miniSectors(points);
    track = trackMap(artA, length, sectors) ?? trackMap(artB, length, sectors);
    for (const [art, label] of [[artA, dA.abbreviation], [artB, dB.abbreviation]] as const)
      for (const m of missingSignals(art)) { missing.add(m); warnings.push(`${label}: ${m} signal not available for this lap.`); }
  } else {
    for (const m of ["speed", "throttle", "brake", "time"]) missing.add(m);
    warnings.push("Telemetry is not available for one or both selected laps, so only lap and sector times are shown.");
  }
  for (const [l, d] of [[lA, dA], [lB, dB]] as const) {
    if (l.isValid === false) warnings.push(`${d.abbreviation} lap ${l.lapNumber} is flagged invalid; it is included because you selected it.`);
    if (l.isPitOutLap) warnings.push(`${d.abbreviation} lap ${l.lapNumber} is an out-lap from the pits, so it is not representative.`);
  }

  const isDemo = s.source.rightsStatus === "synthetic-demo";
  const side = (d: typeof dA, l: LapSummary, sec: typeof sectorsA) => ({
    driverKey: d.key, abbreviation: d.abbreviation, displayName: d.displayName,
    teamName: d.teamName ?? null, teamColour: d.teamColour ?? null, compound: l.compound,
    lapNumber: l.lapNumber, lapTimeMs: l.lapTimeMs, sectorsMs: sec, isValid: l.isValid,
  });
  return {
    calculationVersion: CALCULATION_VERSION,
    session: { key: s.session.key, name: s.session.name, eventKey: s.event.key, eventName: s.event.name, circuitName: s.event.circuitName, season: s.event.year },
    source: { name: s.source.name, rightsStatus: s.source.rightsStatus, isDemo, attribution: s.source.attribution },
    a: side(dA, lA, sectorsA),
    b: side(dB, lB, sectorsB),
    lapDeltaMs: delta,
    sectorDeltasMs: sd,
    brakeKind,
    missingSignals: [...missing],
    warnings,
    summary: deterministicSummary({ aLabel: `${dA.abbreviation} (lap ${lA.lapNumber})`, bLabel: `${dB.abbreviation} (lap ${lB.lapNumber})`, lapDeltaMs: delta, sectorDeltasMs: sd }),
    methodology: [...METHODOLOGY],
    points,
    lapLengthM: length,
    miniSectors: sectors,
    track,
  };
}

export const toQueryString = (q: ComparisonQuery) =>
  new URLSearchParams({ session: q.session, a: q.a, la: String(q.la), b: q.b, lb: String(q.lb) }).toString();

export { FEATURED_SESSIONS as FEATURED } from "./featured";
