import { describe, expect, it } from "vitest";
import { circuitTz } from "./circuits";
import { countdownParts, fmtOffset, isDaylight, latLngToXYZ, subsolarPoint, tzOffsetMin } from "./geo";

describe("geo", () => {
  it("puts the subsolar point on the equator near Greenwich at an equinox noon", () => {
    const s = subsolarPoint(new Date("2026-03-20T12:07:00Z"));
    expect(Math.abs(s.lat)).toBeLessThan(0.5);
    expect(Math.abs(s.lng)).toBeLessThan(1);
  });
  it("tracks the June solstice declination", () => {
    expect(subsolarPoint(new Date("2026-06-21T12:00:00Z")).lat).toBeCloseTo(23.44, 0);
  });
  it("knows day from night", () => {
    const noonUtc = new Date("2026-06-21T12:00:00Z");
    expect(isDaylight(51.5, 0, noonUtc)).toBe(true); // London midday
    expect(isDaylight(-33.9, 151.2, noonUtc)).toBe(false); // Sydney 22:00
  });
  it("maps lat/lng onto the unit sphere (lng 0 faces +z, east is +x, north is +y)", () => {
    const [x, y, z] = latLngToXYZ(0, 0);
    expect(x).toBeCloseTo(0); expect(y).toBeCloseTo(0); expect(z).toBeCloseTo(1);
    expect(latLngToXYZ(0, 90)[0]).toBeCloseTo(1);
    expect(latLngToXYZ(90, 0)[1]).toBeCloseTo(1);
  });
  it("computes DST-aware zone offsets", () => {
    expect(tzOffsetMin("Europe/London", new Date("2026-07-01T12:00:00Z"))).toBe(60);
    expect(tzOffsetMin("Europe/London", new Date("2026-01-01T12:00:00Z"))).toBe(0);
    expect(tzOffsetMin("Asia/Kolkata", new Date("2026-01-01T12:00:00Z"))).toBe(330);
    expect(fmtOffset(330)).toBe("UTC+5:30");
    expect(fmtOffset(-300)).toBe("UTC−5");
  });
  it("falls back to a longitude zone for unknown circuits", () => {
    expect(circuitTz("monaco", 7.4)).toBe("Europe/Monaco");
    expect(circuitTz("new_track", 51)).toBe("Etc/GMT-3");
    expect(circuitTz("new_track", -80)).toBe("Etc/GMT+5");
  });
  it("splits a countdown", () => {
    expect(countdownParts(((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000)).toEqual({ d: 2, h: 3, m: 4, s: 5 });
    expect(countdownParts(-1000)).toEqual({ d: 0, h: 0, m: 0, s: 0 });
  });
});

import { feedTimeToUtc } from "./geo";
describe("feedTimeToUtc", () => {
  it("applies the feed's GMT offset", () => {
    expect(feedTimeToUtc("2026-11-21T20:00:00", "-08:00:00")).toBe("2026-11-22T04:00:00.000Z");
    expect(feedTimeToUtc("2026-11-29T19:00:00", "03:00:00")).toBe("2026-11-29T16:00:00.000Z");
    expect(feedTimeToUtc("2026-11-29T16:00:00Z", "03:00:00")).toBe("2026-11-29T16:00:00Z");
    expect(feedTimeToUtc("", "03:00:00")).toBeNull();
  });
});
