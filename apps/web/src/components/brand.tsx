/** ApexLab mark: a racing line kissing an apex, cut into a concrete block. Original artwork, no third-party marks. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="3" y="3" width="29" height="29" fill="#8B0000" />
      <rect width="29" height="29" fill="#1c1c1c" stroke="#A9A9A9" strokeWidth="2" />
      <path d="M5 23 C 11 23, 12 8, 17 8 S 24 14, 24 6" fill="none" stroke="#CC7722" strokeWidth="3" strokeLinecap="square" />
      <rect x="15" y="6" width="4" height="4" fill="#F4F4F1" />
    </svg>
  );
}
