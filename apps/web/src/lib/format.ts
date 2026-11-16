export function formatDateRange(start: string | null, end: string | null) {
  if (!start) return "";
  const s = new Date(start), e = end ? new Date(end) : s;
  const m = (d: Date) => d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  return s.getUTCMonth() === e.getUTCMonth()
    ? `${s.getUTCDate()}–${e.getUTCDate()} ${m(e)} ${e.getUTCFullYear()}`
    : `${s.getUTCDate()} ${m(s)} – ${e.getUTCDate()} ${m(e)} ${e.getUTCFullYear()}`;
}
export const formatDay = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC" : "";
