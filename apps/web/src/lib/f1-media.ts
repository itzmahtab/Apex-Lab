/**
 * Official car and driver imagery from Formula 1's image CDN (Cloudinary at media.formula1.com),
 * relayed and edge-cached by /api/f1-image. Nothing is copied into this repository. The project owner chose to use these;
 * they remain © Formula 1 / the teams. Unknown images resolve to F1's own fallback silhouette.
 */
/** Served through this site's own /api/f1-image proxy (same origin, edge-cached); see that route. */
const BASE = "/api/f1-image/image/upload";

/** Jolpica constructorId → F1 media folder name. */
const TEAM_SLUG: Record<string, string> = {
  mercedes: "mercedes", ferrari: "ferrari", red_bull: "redbullracing", mclaren: "mclaren", rb: "racingbulls",
  alpine: "alpine", haas: "haasf1team", audi: "audi", sauber: "kicksauber", williams: "williams",
  aston_martin: "astonmartin", cadillac: "cadillac",
};
export const teamSlug = (teamId: string) => TEAM_SLUG[teamId] ?? teamId.replace(/_/g, "");

const letters = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z]/g, "");
/** F1's driver reference: first 3 letters of given + family name + "01" (e.g. Lando Norris → LANNOR01). */
export const driverRef = (given: string, family: string) => `${letters(given).slice(0, 3)}${letters(family).slice(0, 3)}01`.toUpperCase();

/** Side-on car render for a team and season (transparent WebP). */
export const carImage = (season: number, teamId: string, width = 1600) => {
  const t = teamSlug(teamId);
  return `${BASE}/c_lfill,w_${width}/q_auto/v1740000000/common/f1/${season}/${t}/${season}${t}carright.webp`;
};

/** Driver portrait (transparent cut-out), with F1's fallback silhouette if the image is missing. */
export const driverImage = (season: number, teamId: string, ref: string, width = 440) => {
  const t = teamSlug(teamId), r = ref.toLowerCase();
  return `${BASE}/c_lfill,w_${width}/q_auto/d_common:f1:${season}:fallback:driver:${season}fallbackdriverright.webp/v1740000000/common/f1/${season}/${t}/${r}/${season}${t}${r}right.webp`;
};
