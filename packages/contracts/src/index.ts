import { z } from "zod";

export const ARTIFACT_SCHEMA_VERSION = 1;
export const CALCULATION_VERSION = "1.0.0";

/** Keys are URL-safe stable identifiers (never display labels). */
export const keySchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/, "invalid key");

export const rightsStatusSchema = z.enum(["synthetic-demo", "cleared", "unverified"]);

export const telemetrySampleSchema = z.object({
  distanceM: z.number().nonnegative(),
  timeS: z.number().nonnegative().nullable(),
  speedKph: z.number().nonnegative().nullable(),
  throttlePct: z.number().min(0).max(100).nullable(),
  brakePct: z.number().min(0).max(100).nullable(),
  gear: z.number().int().min(0).max(9).nullable(),
  rpm: z.number().nonnegative().nullable().optional(),
  drs: z.boolean().nullable().optional(),
});
export type TelemetrySample = z.infer<typeof telemetrySampleSchema>;

export const artifactSchema = z.object({
  schemaVersion: z.literal(ARTIFACT_SCHEMA_VERSION),
  source: z.object({
    name: z.string(),
    retrievedAt: z.string(),
    rightsStatus: rightsStatusSchema,
    notes: z.string().optional(),
  }),
  session: z.object({ season: z.number().int(), eventKey: keySchema, sessionKey: keySchema }),
  driver: z.object({ key: keySchema, abbreviation: z.string() }),
  lap: z.object({
    number: z.number().int().positive(),
    lapTimeMs: z.number().int().positive().nullable(),
    sector1Ms: z.number().int().positive().nullable(),
    sector2Ms: z.number().int().positive().nullable(),
    sector3Ms: z.number().int().positive().nullable(),
    isValid: z.boolean().nullable(),
  }),
  units: z.object({
    distance: z.literal("m"),
    speed: z.literal("km/h"),
    throttle: z.literal("percent"),
    brake: z.enum(["percent", "boolean"]),
    time: z.literal("seconds-from-lap-start"),
  }),
  samples: z.array(telemetrySampleSchema).min(2),
  /** Car position on the circuit (source coordinate system, arbitrary units), seconds from lap start. */
  track: z.array(z.object({ timeS: z.number(), x: z.number(), y: z.number() })).optional(),
});
export type TelemetryArtifact = z.infer<typeof artifactSchema>;

// ---- Catalog (metadata) ----
export const lapSummarySchema = z.object({
  driverKey: keySchema,
  lapNumber: z.number().int().positive(),
  lapTimeMs: z.number().int().positive().nullable(),
  sector1Ms: z.number().int().positive().nullable(),
  sector2Ms: z.number().int().positive().nullable(),
  sector3Ms: z.number().int().positive().nullable(),
  compound: z.string().nullable(),
  isValid: z.boolean().nullable(),
  hasTelemetry: z.boolean(),
  isPitOutLap: z.boolean().nullable().optional(),
});
export type LapSummary = z.infer<typeof lapSummarySchema>;

export const driverSchema = z.object({
  key: keySchema,
  abbreviation: z.string(),
  displayName: z.string(),
  number: z.number().int().nullable().optional(),
  teamName: z.string().nullable().optional(),
  /** Hex colour without '#', e.g. "3671C6". */
  teamColour: z.string().regex(/^[0-9a-fA-F]{6}$/).nullable().optional(),
});
export type Driver = z.infer<typeof driverSchema>;

export const sessionSchema = z.object({
  key: keySchema,
  eventKey: keySchema,
  sessionType: z.string(),
  name: z.string(),
  drivers: z.array(driverSchema),
  laps: z.array(lapSummarySchema),
  source: z.object({ name: z.string(), rightsStatus: rightsStatusSchema }),
});
export type Session = z.infer<typeof sessionSchema>;

export const eventSchema = z.object({
  key: keySchema,
  name: z.string(),
  circuitName: z.string().nullable(),
  countryCode: z.string().nullable(),
  sessionKeys: z.array(keySchema),
});
export type EventMeta = z.infer<typeof eventSchema>;

export const catalogSchema = z.object({
  schemaVersion: z.literal(1),
  seasons: z.array(z.object({ year: z.number().int(), eventKeys: z.array(keySchema) })),
  events: z.array(eventSchema),
  sessions: z.array(sessionSchema),
});
export type Catalog = z.infer<typeof catalogSchema>;

// ---- Lazy browsing contracts (real data sources are too large for a single catalog) ----
export const eventSummarySchema = z.object({
  key: keySchema,
  year: z.number().int(),
  name: z.string(),
  officialName: z.string().nullable(),
  countryName: z.string().nullable(),
  countryCode: z.string().nullable(),
  circuitName: z.string().nullable(),
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  isTesting: z.boolean(),
});
export type EventSummary = z.infer<typeof eventSummarySchema>;

export const sessionSummarySchema = z.object({
  key: keySchema,
  eventKey: keySchema,
  name: z.string(),
  sessionType: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  /** "completed" once the session has ended; data for upcoming sessions does not exist yet. */
  status: z.enum(["completed", "live", "upcoming"]),
});
export type SessionSummary = z.infer<typeof sessionSummarySchema>;

export const stintSchema = z.object({
  driverKey: keySchema,
  stintNumber: z.number().int(),
  lapStart: z.number().int().nullable(),
  lapEnd: z.number().int().nullable(),
  compound: z.string().nullable(),
  tyreAgeAtStart: z.number().int().nullable(),
});
export type Stint = z.infer<typeof stintSchema>;

export const sourceSchema = z.object({ name: z.string(), rightsStatus: rightsStatusSchema, attribution: z.string().optional() });

export const sessionDetailSchema = z.object({
  session: sessionSummarySchema,
  event: eventSummarySchema,
  drivers: z.array(driverSchema),
  laps: z.array(lapSummarySchema),
  stints: z.array(stintSchema),
  source: sourceSchema,
});
export type SessionDetail = z.infer<typeof sessionDetailSchema>;

// ---- API requests ----
export const comparisonQuerySchema = z
  .object({
    session: keySchema,
    a: keySchema,
    la: z.coerce.number().int().positive(),
    b: keySchema,
    lb: z.coerce.number().int().positive(),
  })
  .refine((q) => q.a !== q.b, { message: "Driver A and Driver B must differ", path: ["b"] });
export type ComparisonQuery = z.infer<typeof comparisonQuerySchema>;

// ---- Comparison output ----
export const chartPointSchema = z.object({
  distanceM: z.number(),
  speedA: z.number().nullable(),
  speedB: z.number().nullable(),
  throttleA: z.number().nullable(),
  throttleB: z.number().nullable(),
  brakeA: z.number().nullable(),
  brakeB: z.number().nullable(),
  gearA: z.number().nullable().optional(),
  gearB: z.number().nullable().optional(),
  /** Cumulative time delta (B - A) at this distance, seconds. Positive: B behind A. */
  deltaS: z.number().nullable(),
});
export type ChartPoint = z.infer<typeof chartPointSchema>;

export const miniSectorSchema = z.object({
  index: z.number().int(),
  startM: z.number(),
  endM: z.number(),
  /** Time B lost to A inside this mini-sector (ms). Positive => A faster here. */
  gainMs: z.number().nullable(),
  winner: z.enum(["a", "b", "tie"]).nullable(),
});
export type MiniSector = z.infer<typeof miniSectorSchema>;

export const trackMapSchema = z.object({
  /** Polyline points in source units; `s` is the mini-sector index each point belongs to. */
  points: z.array(z.object({ x: z.number(), y: z.number(), s: z.number().int() })),
});
export type TrackMap = z.infer<typeof trackMapSchema>;

const sideSchema = z.object({
  driverKey: keySchema,
  abbreviation: z.string(),
  displayName: z.string(),
  teamName: z.string().nullable(),
  teamColour: z.string().nullable(),
  compound: z.string().nullable(),
  lapNumber: z.number().int(),
  lapTimeMs: z.number().int().nullable(),
  sectorsMs: z.tuple([z.number().nullable(), z.number().nullable(), z.number().nullable()]),
  isValid: z.boolean().nullable(),
});

export const comparisonResultSchema = z.object({
  calculationVersion: z.string(),
  session: z.object({
    key: keySchema,
    name: z.string(),
    eventKey: keySchema,
    eventName: z.string(),
    circuitName: z.string().nullable(),
    season: z.number().int(),
  }),
  source: z.object({ name: z.string(), rightsStatus: rightsStatusSchema, isDemo: z.boolean(), attribution: z.string().optional() }),
  a: sideSchema,
  b: sideSchema,
  lapDeltaMs: z.number().int().nullable(),
  sectorDeltasMs: z.tuple([z.number().nullable(), z.number().nullable(), z.number().nullable()]),
  brakeKind: z.enum(["percent", "boolean"]),
  missingSignals: z.array(z.string()),
  warnings: z.array(z.string()),
  summary: z.string(),
  methodology: z.array(z.string()),
  points: z.array(chartPointSchema),
  lapLengthM: z.number().nullable(),
  miniSectors: z.array(miniSectorSchema),
  track: trackMapSchema.nullable(),
});
export type ComparisonResult = z.infer<typeof comparisonResultSchema>;

// ---- Errors ----
export const errorCodeSchema = z.enum([
  "VALIDATION_ERROR", "NOT_FOUND", "TELEMETRY_UNAVAILABLE", "UPSTREAM_UNAVAILABLE",
  "UNSUPPORTED_ARTIFACT_VERSION", "INTERNAL_ERROR",
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;
export const apiErrorSchema = z.object({
  error: z.object({ code: errorCodeSchema, message: z.string() }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
