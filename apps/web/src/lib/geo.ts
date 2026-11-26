/** Small geo/time helpers shared by the globe and clocks. Pure, client-safe. */

const RAD = Math.PI / 180;

/** Unit-sphere position for lat/lng (y up, lng 0 facing +z). */
export function latLngToXYZ(lat: number, lng: number, r = 1): [number, number, number] {
  const phi = (90 - lat) * RAD, theta = (lng + 90) * RAD;
  return [r * Math.sin(phi) * Math.cos(theta) * -1, r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)];
}

/**
 * Subsolar point (where the sun is directly overhead) for a moment in time.
 * Low-precision solar ephemeris (accurate to a fraction of a degree), enough to draw the day/night terminator.
 */
export function subsolarPoint(date: Date): { lat: number; lng: number } {
  const d = date.getTime() / 86400000 - 10957.5; // days since J2000.0
  const g = (357.529 + 0.98560028 * d) * RAD;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const e = (23.439 - 0.00000036 * d) * RAD;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / RAD;
  const dec = Math.asin(Math.sin(e) * Math.sin(L)) / RAD;
  const gmst = (18.697374558 + 24.06570982441908 * d) % 24;
  let lng = ra - gmst * 15;
  lng = ((lng + 540) % 360) - 180;
  return { lat: dec, lng };
}

/** "14:05" in a zone. */
export const timeIn = (tz: string, at: Date, seconds = false) =>
  at.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", ...(seconds ? { second: "2-digit" } : {}) });

/** Offset of a zone from UTC in minutes at a given moment. */
export function tzOffsetMin(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" })
    .formatToParts(at).reduce<Record<string, number>>((a, p) => (p.type !== "literal" ? { ...a, [p.type]: Number(p.value) } : a), {});
  const asUtc = Date.UTC(parts.year!, parts.month! - 1, parts.day!, parts.hour!, parts.minute!);
  return Math.round((asUtc - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

export const fmtOffset = (min: number) => {
  const s = min < 0 ? "−" : "+", a = Math.abs(min);
  return `UTC${s}${Math.floor(a / 60)}${a % 60 ? `:${String(a % 60).padStart(2, "0")}` : ""}`;
};

/** Is it daytime at lat/lng right now? (sun above the horizon) */
export function isDaylight(lat: number, lng: number, at: Date): boolean {
  const s = subsolarPoint(at);
  const a = latLngToXYZ(lat, lng), b = latLngToXYZ(s.lat, s.lng);
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] > -0.0145; // sun's radius + refraction
}

export function countdownParts(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}
