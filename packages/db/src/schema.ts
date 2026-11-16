import { sql } from "drizzle-orm";
import {
  boolean, check, index, integer, jsonb, numeric, pgTable, text, timestamp, unique, uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const seasons = pgTable("seasons", {
  id: id(),
  year: integer("year").notNull().unique(),
  status: text("status").notNull().default("completed"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: id(),
  seasonId: uuid("season_id").notNull().references(() => seasons.id),
  externalKey: text("external_key").notNull(),
  name: text("name").notNull(),
  circuitName: text("circuit_name"),
  countryCode: text("country_code"),
  startAt: ts("start_at"),
  status: text("status").notNull().default("completed"),
}, (t) => [
  unique("events_season_key_uq").on(t.seasonId, t.externalKey),
  index("events_season_start_idx").on(t.seasonId, t.startAt),
]);

export const sessions = pgTable("sessions", {
  id: id(),
  eventId: uuid("event_id").notNull().references(() => events.id),
  externalKey: text("external_key").notNull(),
  sessionType: text("session_type").notNull(),
  name: text("name").notNull(),
  startedAt: ts("started_at"),
  status: text("status").notNull().default("scheduled"),
  processedAt: ts("processed_at"),
  artifactVersion: integer("artifact_version"),
  sourceName: text("source_name").notNull().default("unknown"),
  rightsStatus: text("rights_status").notNull().default("unverified"),
}, (t) => [
  unique("sessions_event_key_uq").on(t.eventId, t.externalKey),
  index("sessions_event_type_idx").on(t.eventId, t.sessionType),
]);

export const drivers = pgTable("drivers", {
  id: id(),
  externalKey: text("external_key").notNull().unique(),
  abbreviation: text("abbreviation").notNull(),
  displayName: text("display_name").notNull(),
  nationality: text("nationality"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const laps = pgTable("laps", {
  id: id(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id),
  driverId: uuid("driver_id").notNull().references(() => drivers.id),
  lapNumber: integer("lap_number").notNull(),
  lapTimeMs: integer("lap_time_ms"),
  sector1Ms: integer("sector_1_ms"),
  sector2Ms: integer("sector_2_ms"),
  sector3Ms: integer("sector_3_ms"),
  compound: text("compound"),
  tyreLife: numeric("tyre_life"),
  isValid: boolean("is_valid"),
  sourceStatus: text("source_status"),
}, (t) => [
  unique("laps_session_driver_lap_uq").on(t.sessionId, t.driverId, t.lapNumber),
  index("laps_lookup_idx").on(t.sessionId, t.driverId, t.lapNumber),
  check("laps_number_positive", sql`${t.lapNumber} > 0`),
]);

export const telemetryArtifacts = pgTable("telemetry_artifacts", {
  id: id(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id),
  driverId: uuid("driver_id").notNull().references(() => drivers.id),
  lapNumber: integer("lap_number").notNull(),
  artifactUri: text("artifact_uri").notNull(),
  formatVersion: integer("format_version").notNull(),
  calculationVersion: text("calculation_version").notNull(),
  sourceKey: text("source_key").notNull(),
  processedAt: ts("processed_at").notNull(),
  metadataJson: jsonb("metadata_json"),
}, (t) => [
  unique("telemetry_artifacts_uq").on(t.sessionId, t.driverId, t.lapNumber, t.formatVersion, t.calculationVersion),
  index("telemetry_artifacts_lookup_idx").on(t.sessionId, t.driverId, t.lapNumber),
]);

export const comparisons = pgTable("comparisons", {
  id: id(),
  slug: text("slug").notNull().unique(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id),
  driverAId: uuid("driver_a_id").notNull().references(() => drivers.id),
  driverBId: uuid("driver_b_id").notNull().references(() => drivers.id),
  lapA: integer("lap_a").notNull(),
  lapB: integer("lap_b").notNull(),
  summaryJson: jsonb("summary_json"),
  visibility: text("visibility").notNull().default("public"),
  createdAt: ts("created_at").notNull().defaultNow(),
}, (t) => [check("comparisons_drivers_differ", sql`${t.driverAId} <> ${t.driverBId}`)]);

export const shareAssets = pgTable("share_assets", {
  id: id(),
  comparisonId: uuid("comparison_id").notNull().references(() => comparisons.id),
  assetUri: text("asset_uri").notNull(),
  assetType: text("asset_type").notNull(),
  generatedAt: ts("generated_at").notNull().defaultNow(),
  expiresAt: ts("expires_at"),
});

export const processingJobs = pgTable("processing_jobs", {
  id: id(),
  sessionId: uuid("session_id").notNull().references(() => sessions.id),
  status: text("status").notNull(),
  attempts: integer("attempts").notNull().default(0),
  startedAt: ts("started_at"),
  finishedAt: ts("finished_at"),
  errorCode: text("error_code"),
  logSummary: text("log_summary"),
  inputHash: text("input_hash"),
}, (t) => [index("processing_jobs_session_status_idx").on(t.sessionId, t.status)]);
