/** Idempotent seed of metadata from data/fixtures/demo/catalog.json (synthetic demo data). */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
import { artifactSchema, catalogSchema, ARTIFACT_SCHEMA_VERSION, CALCULATION_VERSION } from "@apexlab/contracts";
import { createDb } from "./client";
import * as t from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const root = process.env.FIXTURE_DIR ?? new URL("../../../data/fixtures/demo", import.meta.url).pathname;
const catalog = catalogSchema.parse(JSON.parse(readFileSync(join(root, "catalog.json"), "utf8")));
const { db, close } = createDb(url);

await db.transaction(async (tx) => {
  const driverIds = new Map<string, string>();
  for (const s of catalog.sessions) for (const d of s.drivers) {
    const [row] = await tx.insert(t.drivers).values({ externalKey: d.key, abbreviation: d.abbreviation, displayName: d.displayName })
      .onConflictDoUpdate({ target: t.drivers.externalKey, set: { abbreviation: d.abbreviation, displayName: d.displayName } }).returning();
    driverIds.set(d.key, row!.id);
  }
  for (const season of catalog.seasons) {
    const [sr] = await tx.insert(t.seasons).values({ year: season.year, status: "completed" })
      .onConflictDoUpdate({ target: t.seasons.year, set: { status: "completed" } }).returning();
    for (const ek of season.eventKeys) {
      const ev = catalog.events.find((e) => e.key === ek)!;
      const [er] = await tx.insert(t.events).values({ seasonId: sr!.id, externalKey: ev.key, name: ev.name, circuitName: ev.circuitName, countryCode: ev.countryCode })
        .onConflictDoUpdate({ target: [t.events.seasonId, t.events.externalKey], set: { name: ev.name, circuitName: ev.circuitName } }).returning();
      for (const sk of ev.sessionKeys) {
        const s = catalog.sessions.find((x) => x.key === sk)!;
        const [ses] = await tx.insert(t.sessions).values({
          eventId: er!.id, externalKey: s.key, sessionType: s.sessionType, name: s.name, status: "processed",
          processedAt: new Date(), artifactVersion: ARTIFACT_SCHEMA_VERSION, sourceName: s.source.name, rightsStatus: s.source.rightsStatus,
        }).onConflictDoUpdate({ target: [t.sessions.eventId, t.sessions.externalKey], set: { name: s.name, status: "processed", sourceName: s.source.name, rightsStatus: s.source.rightsStatus } }).returning();
        for (const l of s.laps) {
          await tx.insert(t.laps).values({
            sessionId: ses!.id, driverId: driverIds.get(l.driverKey)!, lapNumber: l.lapNumber, lapTimeMs: l.lapTimeMs,
            sector1Ms: l.sector1Ms, sector2Ms: l.sector2Ms, sector3Ms: l.sector3Ms, compound: l.compound, isValid: l.isValid,
          }).onConflictDoUpdate({ target: [t.laps.sessionId, t.laps.driverId, t.laps.lapNumber], set: { lapTimeMs: l.lapTimeMs, isValid: l.isValid } });
        }
        const dir = join(root, "artifacts", s.key);
        for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
          const art = artifactSchema.parse(JSON.parse(readFileSync(join(dir, f), "utf8")));
          await tx.insert(t.telemetryArtifacts).values({
            sessionId: ses!.id, driverId: driverIds.get(art.driver.key)!, lapNumber: art.lap.number,
            artifactUri: `${s.key}/${f}`, formatVersion: art.schemaVersion, calculationVersion: CALCULATION_VERSION,
            sourceKey: art.source.name, processedAt: new Date(art.source.retrievedAt),
          }).onConflictDoNothing();
        }
      }
    }
  }
});
await close();
console.log("seeded demo metadata");
