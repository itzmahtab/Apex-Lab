/** Inline icons (Lucide-style strokes, square caps). No emoji in the UI. */
type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "square" as const, strokeLinejoin: "miter" as const };

export const TrophyIcon = ({ className = "h-4 w-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden><path d="M8 4h8v6a4 4 0 0 1-8 0V4ZM8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 14v4M8 21h8M9 18h6" /></svg>
);
export const FlagIcon = ({ className = "h-4 w-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden><path d="M5 21V4M5 4h12l-2 4 2 4H5" /></svg>
);
export const PulseIcon = ({ className = "h-4 w-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden><path d="M2 12h5l3-7 4 14 3-7h5" /></svg>
);
export const ArrowRightIcon = ({ className = "h-4 w-4" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={3} aria-hidden><path d="M4 12h15M13 5l7 7-7 7" /></svg>
);
