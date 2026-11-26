/**
 * Static circuit reference: IANA time zone (for live local clocks, DST-correct) and coordinates.
 * Coordinates match the Jolpica/Ergast circuit table; the time zone is not published by either API.
 */
export interface CircuitRef { tz: string; lat: number; lng: number; locality: string; country: string }

export const CIRCUITS: Record<string, CircuitRef> = {
  albert_park: { tz: "Australia/Melbourne", lat: -37.8497, lng: 144.968, locality: "Melbourne", country: "Australia" },
  americas: { tz: "America/Chicago", lat: 30.1328, lng: -97.6411, locality: "Austin", country: "USA" },
  bahrain: { tz: "Asia/Bahrain", lat: 26.0325, lng: 50.5106, locality: "Sakhir", country: "Bahrain" },
  baku: { tz: "Asia/Baku", lat: 40.3725, lng: 49.8533, locality: "Baku", country: "Azerbaijan" },
  catalunya: { tz: "Europe/Madrid", lat: 41.57, lng: 2.26111, locality: "Barcelona", country: "Spain" },
  hungaroring: { tz: "Europe/Budapest", lat: 47.5789, lng: 19.2486, locality: "Budapest", country: "Hungary" },
  imola: { tz: "Europe/Rome", lat: 44.3439, lng: 11.7167, locality: "Imola", country: "Italy" },
  interlagos: { tz: "America/Sao_Paulo", lat: -23.7036, lng: -46.6997, locality: "São Paulo", country: "Brazil" },
  jeddah: { tz: "Asia/Riyadh", lat: 21.6319, lng: 39.1044, locality: "Jeddah", country: "Saudi Arabia" },
  losail: { tz: "Asia/Qatar", lat: 25.49, lng: 51.4542, locality: "Lusail", country: "Qatar" },
  madring: { tz: "Europe/Madrid", lat: 40.46528, lng: -3.61528, locality: "Madrid", country: "Spain" },
  marina_bay: { tz: "Asia/Singapore", lat: 1.2914, lng: 103.864, locality: "Marina Bay", country: "Singapore" },
  miami: { tz: "America/New_York", lat: 25.9581, lng: -80.2389, locality: "Miami", country: "USA" },
  monaco: { tz: "Europe/Monaco", lat: 43.7347, lng: 7.42056, locality: "Monte Carlo", country: "Monaco" },
  monza: { tz: "Europe/Rome", lat: 45.6156, lng: 9.28111, locality: "Monza", country: "Italy" },
  red_bull_ring: { tz: "Europe/Vienna", lat: 47.2197, lng: 14.7647, locality: "Spielberg", country: "Austria" },
  rodriguez: { tz: "America/Mexico_City", lat: 19.4042, lng: -99.0907, locality: "Mexico City", country: "Mexico" },
  sepang: { tz: "Asia/Kuala_Lumpur", lat: 2.76083, lng: 101.738, locality: "Kuala Lumpur", country: "Malaysia" },
  shanghai: { tz: "Asia/Shanghai", lat: 31.3389, lng: 121.22, locality: "Shanghai", country: "China" },
  silverstone: { tz: "Europe/London", lat: 52.0786, lng: -1.01694, locality: "Silverstone", country: "UK" },
  spa: { tz: "Europe/Brussels", lat: 50.4372, lng: 5.97139, locality: "Spa", country: "Belgium" },
  suzuka: { tz: "Asia/Tokyo", lat: 34.8431, lng: 136.541, locality: "Suzuka", country: "Japan" },
  vegas: { tz: "America/Los_Angeles", lat: 36.1147, lng: -115.173, locality: "Las Vegas", country: "USA" },
  villeneuve: { tz: "America/Toronto", lat: 45.5, lng: -73.5228, locality: "Montreal", country: "Canada" },
  yas_marina: { tz: "Asia/Dubai", lat: 24.4672, lng: 54.6031, locality: "Abu Dhabi", country: "UAE" },
  zandvoort: { tz: "Europe/Amsterdam", lat: 52.3888, lng: 4.54092, locality: "Zandvoort", country: "Netherlands" },
};

/** IANA zone for a circuit; unknown circuits fall back to a whole-hour zone from their longitude. */
export function circuitTz(circuitId: string, lng: number): string {
  const known = CIRCUITS[circuitId]?.tz;
  if (known) return known;
  const h = Math.max(-12, Math.min(14, Math.round(lng / 15)));
  return h === 0 ? "Etc/UTC" : `Etc/GMT${h > 0 ? "-" : "+"}${Math.abs(h)}`; // Etc/ signs are inverted
}

/** Fallback colours by constructor, used when live team colours are unavailable. */
export const TEAM_FALLBACK: Record<string, string> = {
  mercedes: "#27F4D2", ferrari: "#E8002D", red_bull: "#3671C6", mclaren: "#FF8000", rb: "#6692FF",
  alpine: "#0093CC", haas: "#B6BABD", audi: "#F50537", sauber: "#52E252", williams: "#64C4FF",
  aston_martin: "#229971", cadillac: "#C8C8C8",
};
