import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Card = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-2xl border border-border bg-surface/80 p-4 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] sm:p-6", className)} {...p} />
);
export const CardTitle = ({ className, ...p }: HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("text-sm font-medium uppercase tracking-[0.12em] text-muted", className)} {...p} />
);
export const Badge = ({ className, tone = "neutral", ...p }: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "warn" | "live" }) => (
  <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
    tone === "warn" ? "border-warn/40 bg-warn/10 text-warn" : tone === "live" ? "border-throttle/40 bg-throttle/10 text-throttle" : "border-border bg-elevated text-muted", className)} {...p} />
);
