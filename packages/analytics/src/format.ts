/** 90400 -> "1:30.400" */
export function formatLapTime(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const m = Math.floor(ms / 60000);
  const s = (ms - m * 60000) / 1000;
  return `${m}:${s.toFixed(3).padStart(6, "0")}`;
}

/** Signed delta with explicit sign, in seconds: 312 -> "+0.312 s". */
export function formatDelta(ms: number | null | undefined): string {
  if (ms == null) return "—";
  const sign = ms > 0 ? "+" : ms < 0 ? "−" : "±";
  return `${sign}${(Math.abs(ms) / 1000).toFixed(3)} s`;
}

export function formatSector(ms: number | null | undefined): string {
  return ms == null ? "—" : (ms / 1000).toFixed(3);
}
