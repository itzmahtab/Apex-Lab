/** ApexLab mark: a racing line kissing an apex. Original artwork, no third-party marks. */
export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#141820" stroke="#2A303A" />
      <path d="M6 24 C 12 24, 13 9, 18 9 S 26 15, 26 8" fill="none" stroke="#FF453A" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="18" cy="9" r="2.2" fill="#F4F6F8" />
    </svg>
  );
}
