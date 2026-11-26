"use client";
import { useEffect, useState } from "react";
import { countdownParts, fmtOffset, isDaylight, timeIn, tzOffsetMin } from "@/lib/geo";

/** Current time, ticking every `ms`. `null` until mounted, so server and client markup match. */
export function useNow(ms = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export const SunIcon = ({ day }: { day: boolean }) => day ? (
  <svg viewBox="0 0 24 24" className="h-4 w-4 text-warn" aria-label="Daytime" role="img"><circle cx="12" cy="12" r="4.5" fill="currentColor" /><g stroke="currentColor" strokeWidth="2" strokeLinecap="round">{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <line key={a} x1="12" y1="2.5" x2="12" y2="4.5" transform={`rotate(${a} 12 12)`} />)}</g></svg>
) : (
  <svg viewBox="0 0 24 24" className="h-4 w-4 text-telemetry" aria-label="Night-time" role="img"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" fill="currentColor" /></svg>
);

/** Live local clock for a place, with day/night and the offset from the viewer. */
export function LocalClock({ tz, lat, lng, label, seconds = true, className }: { tz: string; lat: number; lng: number; label?: string; seconds?: boolean; className?: string }) {
  const now = useNow(1000);
  if (!now) return <span className={className}>&nbsp;</span>;
  const diff = tzOffsetMin(tz, now) + now.getTimezoneOffset();
  const rel = diff === 0 ? "same as you" : `${diff > 0 ? "+" : "−"}${Math.abs(diff / 60)}h vs you`;
  return (
    <span className={className}>
      <span className="inline-flex items-center gap-2">
        <SunIcon day={isDaylight(lat, lng, now)} />
        <span className="num text-fg">{timeIn(tz, now, seconds)}</span>
        {label && <span className="text-muted">{label}</span>}
      </span>
      <span className="block text-xs text-subtle num">{fmtOffset(tzOffsetMin(tz, now))} · {rel}</span>
    </span>
  );
}

/** Big flip-style countdown. */
export function Countdown({ to, compact = false }: { to: string; compact?: boolean }) {
  const now = useNow(1000);
  const ms = now ? Date.parse(to) - now.getTime() : null;
  const p = countdownParts(ms ?? 0);
  const cells: [number, string][] = [[p.d, "days"], [p.h, "hrs"], [p.m, "min"], [p.s, "sec"]];
  return (
    <div className="grid grid-cols-4 border-2 border-border-strong" role="timer" aria-live="off"
      aria-label={ms == null ? "Countdown" : `${p.d} days ${p.h} hours ${p.m} minutes`}>
      {cells.map(([v, l]) => (
        <div key={l} className={`border-r-2 border-border-strong bg-bg text-center last:border-r-0 ${compact ? "px-1 py-1.5" : "px-2 py-3"}`}>
          <div className={`num tabular-nums ${compact ? "text-xl" : "text-3xl sm:text-5xl"}`}>{ms == null ? "--" : String(v).padStart(2, "0")}</div>
          <div className="stamp text-[10px] text-subtle">{l}</div>
        </div>
      ))}
    </div>
  );
}

/** A timestamp rendered in a given zone (or the viewer's when tz is omitted), client-side only. */
export function ZonedTime({ iso, tz, withDay = true }: { iso: string; tz?: string; withDay?: boolean }) {
  const now = useNow(60_000);
  if (!now) return <span className="num">--:--</span>;
  const d = new Date(iso);
  return (
    <span className="num">
      {withDay && d.toLocaleDateString("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short" }) + " · "}
      {d.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}
