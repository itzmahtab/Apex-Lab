import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Card = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-lg border border-border bg-surface p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] sm:p-6", className)} {...p} />
);
export const CardTitle = ({ className, ...p }: HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted", className)} {...p} />
);
export const Badge = ({ className, tone = "neutral", ...p }: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "warn" | "live" }) => (
  <span className={cn("inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider",
    tone === "warn" ? "border-warn bg-warn text-bg" : tone === "live" ? "border-throttle bg-throttle text-bg" : "border-border bg-elevated text-muted", className)} {...p} />
);
