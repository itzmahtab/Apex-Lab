import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { artifactSchema, catalogSchema, comparisonQuerySchema } from "./index";

const root = new URL("../../../data/fixtures/demo/", import.meta.url);

describe("contracts", () => {
  it("committed demo catalog and artifacts validate", () => {
    const cat = catalogSchema.parse(JSON.parse(readFileSync(new URL("catalog.json", root), "utf8")));
    expect(cat.sessions[0]?.source.rightsStatus).toBe("synthetic-demo");
    const art = artifactSchema.parse(JSON.parse(readFileSync(new URL("artifacts/demo-qualifying/demo-driver-a-lap2.json", root), "utf8")));
    expect(art.samples.length).toBeGreaterThan(100);
  });
  it("rejects path-like keys, same driver, bad laps", () => {
    const base = { session: "demo-qualifying", a: "a", la: "1", b: "b", lb: "1" };
    expect(comparisonQuerySchema.safeParse(base).success).toBe(true);
    expect(comparisonQuerySchema.safeParse({ ...base, session: "../x" }).success).toBe(false);
    expect(comparisonQuerySchema.safeParse({ ...base, b: "a" }).success).toBe(false);
    expect(comparisonQuerySchema.safeParse({ ...base, la: "0" }).success).toBe(false);
  });
  it("rejects unsupported artifact version", () => {
    expect(artifactSchema.safeParse({ schemaVersion: 2 }).success).toBe(false);
  });
});
