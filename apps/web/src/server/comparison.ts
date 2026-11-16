import "server-only";
import {
  CALCULATION_VERSION, comparisonQuerySchema, type ComparisonQuery, type ComparisonResult, type Catalog,
} from "@apexlab/contracts";
import {
  METHODOLOGY, alignByDistance, deterministicSummary, lapDeltaMs, missingSignals, sectorDeltasMs,
} from "@apexlab/analytics";
import { AppError } from "./errors";
import { getRepository } from "./repository";

export function parseQuery(input: Record<string, unknown>): ComparisonQuery {
  const r = comparisonQuerySchema.safeParse(input);
  if (!r.success) throw new AppError("VALIDATION_ERROR", r.error.issues.map((i) => `${i.path.join(".") || "query"}: ${i.message}`).join("; "));
  return r.data;
}

/** Validate the selection against the catalog: existence AND relationships (never trust client IDs). */
export function resolveSelection(catalog: Catalog, q: ComparisonQuery) {
  const session = catalog.sessions.find((s) => s.key === q.session);
  if (!session) throw new AppError("NOT_FOUND", "Unknown session.");
  const event = catalog.events.find((e) => e.key === session.eventKey);
  const season = catalog.seasons.find((s) => s.eventKeys.includes(session.eventKey));
  if (!event || !season) throw new AppError("NOT_FOUND", "Unknown event.");
  const driver = (k: string) => {
    const d = session.drivers.find((x) => x.key === k);
    if (!d) throw new AppError("VALIDATION_ERROR", `Driver "${k}" is not in this session.`);
    return d;
  };
  const lap = (k: string, n: number) => {
    const l = session.laps.find((x) => x.driverKey === k && x.lapNumber === n);
    if (!l) throw new AppError("VALIDATION_ERROR", `Lap ${n} does not exist for driver "${k}".`);
    return l;
  };
  return { session, event, season, dA: driver(q.a), dB: driver(q.b), lA: lap(q.a, q.la), lB: lap(q.b, q.lb) };
}

export async function buildComparison(input: Record<string, unknown>): Promise<ComparisonResult> {
  const q = parseQuery(input);
  const repo = getRepository();
  const catalog = await repo.getCatalog();
  const { session, event, season, dA, dB, lA, lB } = resolveSelection(catalog, q);

  const [artA, artB] = await Promise.all([
    lA.hasTelemetry ? repo.getArtifact(q.session, q.a, q.la) : null,
    lB.hasTelemetry ? repo.getArtifact(q.session, q.b, q.lb) : null,
  ]);
  if ((lA.hasTelemetry && !artA) || (lB.hasTelemetry && !artB))
    throw new AppError("TELEMETRY_UNAVAILABLE", "Telemetry for a selected lap is missing.");

  const sectorsA: [number | null, number | null, number | null] = [lA.sector1Ms, lA.sector2Ms, lA.sector3Ms];
  const sectorsB: [number | null, number | null, number | null] = [lB.sector1Ms, lB.sector2Ms, lB.sector3Ms];
  const delta = lapDeltaMs(lA.lapTimeMs, lB.lapTimeMs);
  const sd = sectorDeltasMs(sectorsA, sectorsB);

  const warnings: string[] = [];
  const missing = new Set<string>();
  let points: ComparisonResult["points"] = [];
  let brakeKind: "percent" | "boolean" = "percent";
  if (artA && artB) {
    if (artA.units.brake !== artB.units.brake) {
      warnings.push("The two laps report brake data in different forms, so the brake chart is hidden.");
      missing.add("brake");
    } else brakeKind = artA.units.brake;
    points = alignByDistance(artA, artB);
    for (const [art, label] of [[artA, dA.abbreviation], [artB, dB.abbreviation]] as const)
      for (const m of missingSignals(art)) { missing.add(m); warnings.push(`${label}: ${m} signal not available for this lap.`); }
  } else {
    for (const m of ["speed", "throttle", "brake"]) missing.add(m);
    warnings.push("Telemetry is not available for one or both selected laps; showing lap and sector times only.");
  }
  for (const [l, d] of [[lA, dA], [lB, dB]] as const)
    if (l.isValid === false) warnings.push(`${d.abbreviation} lap ${l.lapNumber} is flagged invalid (e.g. track limits); it is included because you selected it.`);

  const isDemo = session.source.rightsStatus === "synthetic-demo";
  return {
    calculationVersion: CALCULATION_VERSION,
    session: { key: session.key, name: session.name, eventName: event.name, circuitName: event.circuitName, season: season.year },
    source: { name: session.source.name, rightsStatus: session.source.rightsStatus, isDemo },
    a: { driverKey: dA.key, abbreviation: dA.abbreviation, displayName: dA.displayName, lapNumber: lA.lapNumber, lapTimeMs: lA.lapTimeMs, sectorsMs: sectorsA, isValid: lA.isValid },
    b: { driverKey: dB.key, abbreviation: dB.abbreviation, displayName: dB.displayName, lapNumber: lB.lapNumber, lapTimeMs: lB.lapTimeMs, sectorsMs: sectorsB, isValid: lB.isValid },
    lapDeltaMs: delta,
    sectorDeltasMs: sd,
    brakeKind,
    missingSignals: [...missing],
    warnings,
    summary: deterministicSummary({ aLabel: `${dA.abbreviation} (lap ${lA.lapNumber})`, bLabel: `${dB.abbreviation} (lap ${lB.lapNumber})`, lapDeltaMs: delta, sectorDeltasMs: sd }),
    methodology: [...METHODOLOGY],
    points,
  };
}

/** Suggested starting selection: first session, first two drivers, each one's fastest valid lap with telemetry. */
export function defaultSelection(catalog: Catalog): ComparisonQuery | null {
  const s = catalog.sessions[0];
  const [d1, d2] = s?.drivers ?? [];
  if (!s || !d1 || !d2) return null;
  const best = (k: string) =>
    s.laps.filter((l) => l.driverKey === k && l.hasTelemetry && l.isValid !== false && l.lapTimeMs != null)
      .sort((x, y) => x.lapTimeMs! - y.lapTimeMs!)[0]?.lapNumber;
  const la = best(d1.key), lb = best(d2.key);
  return la && lb ? { session: s.key, a: d1.key, la, b: d2.key, lb } : null;
}

export const toQueryString = (q: ComparisonQuery) =>
  new URLSearchParams({ session: q.session, a: q.a, la: String(q.la), b: q.b, lb: String(q.lb) }).toString();
