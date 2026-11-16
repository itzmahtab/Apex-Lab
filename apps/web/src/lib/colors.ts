/** Driver colour helpers. Identity is never colour-only (B is always dashed), but colours must still be distinguishable. */
const FALLBACK_A = "#56B4E9";
const FALLBACK_B = "#FF453A";

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const toHex = (c: number[]) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

function distance(a: string, b: string) {
  const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}
/** Lift very dark team colours so lines stay visible on the graphite background. */
function legible(hex: string) {
  const c = rgb(hex);
  const lum = (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
  return lum < 0.28 ? toHex(c.map((v) => v + (255 - v) * 0.45)) : hex;
}

export function teamHex(colour: string | null | undefined, fallback: string) {
  return colour && /^[0-9a-fA-F]{6}$/.test(colour) ? legible(`#${colour.toUpperCase()}`) : fallback;
}

/** Colours for drivers A and B. Teammates (same colour) get B shifted to a light tint. */
export function pairColours(a: string | null | undefined, b: string | null | undefined): { a: string; b: string } {
  const ca = teamHex(a, FALLBACK_A);
  let cb = teamHex(b, FALLBACK_B);
  if (distance(ca, cb) < 90) {
    const tint = toHex(rgb(cb).map((v) => v + (255 - v) * 0.6));
    cb = distance(ca, tint) < 90 ? "#F4F6F8" : tint;
  }
  return { a: ca, b: cb };
}

export const COMPOUND: Record<string, { label: string; colour: string; text: string }> = {
  SOFT: { label: "S", colour: "#FF3B30", text: "#fff" },
  MEDIUM: { label: "M", colour: "#FFD60A", text: "#111" },
  HARD: { label: "H", colour: "#F2F2F2", text: "#111" },
  INTERMEDIATE: { label: "I", colour: "#34C759", text: "#111" },
  WET: { label: "W", colour: "#0A84FF", text: "#fff" },
};
