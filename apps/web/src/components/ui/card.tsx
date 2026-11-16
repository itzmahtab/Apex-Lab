import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Card = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-xl border border-border bg-surface p-4 sm:p-5", className)} {...p} />
);
export const Badge = ({ className, tone = "neutral", ...p }: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "warn" }) => (
  <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
    tone === "warn" ? "border-warn/50 bg-warn/10 text-warn" : "border-border bg-elevated text-muted", className)} {...p} />
);
