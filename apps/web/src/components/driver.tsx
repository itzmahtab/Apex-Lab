import { COMPOUND } from "@/lib/colors";
import { cn } from "@/lib/cn";

export function CompoundBadge({ compound, className }: { compound: string | null | undefined; className?: string }) {
  if (!compound) return null;
  const c = COMPOUND[compound.toUpperCase()];
  if (!c) return <span className={cn("text-xs text-muted", className)}>{compound}</span>;
  return (
    <span title={`${compound.toLowerCase()} tyre`} className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-black/40", className)}
      style={{ background: c.colour, color: c.text }}>
      {c.label}<span className="sr-only"> ({compound.toLowerCase()} tyre)</span>
    </span>
  );
}

/** Line sample used in legends: solid for A, dashed for B — identity never by colour alone. */
export function LineKey({ colour, dashed }: { colour: string; dashed?: boolean }) {
  return (
    <svg width="22" height="8" aria-hidden="true" className="shrink-0">
      <line x1="1" y1="4" x2="21" y2="4" stroke={colour} strokeWidth="3" strokeLinecap="round" strokeDasharray={dashed ? "5 3" : undefined} />
    </svg>
  );
}

export function DriverChip({ abbr, colour, dashed, className }: { abbr: string; colour: string; dashed?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md bg-elevated px-1.5 py-0.5 text-xs font-semibold num", className)}>
      <LineKey colour={colour} dashed={dashed} />{abbr}
    </span>
  );
}
