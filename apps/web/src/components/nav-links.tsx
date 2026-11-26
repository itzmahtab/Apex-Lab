"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNow } from "@/components/clock";

const NAV = [
  { href: "/", label: "Season" },
  { href: "/live", label: "Live" },
  { href: "/compare", label: "Compare" },
  { href: "/events", label: "Calendar" },
  { href: "/methodology", label: "Method" },
];

export function NavLinks() {
  const path = usePathname();
  const active = (h: string) => (h === "/" ? path === "/" || path.startsWith("/gp") : path.startsWith(h));
  return (
    <nav aria-label="Primary" className="flex items-stretch">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}
          className={`relative flex items-center px-2 text-xs uppercase tracking-wide transition-colors duration-200 sm:px-3 sm:text-sm ${active(n.href) ? "text-fg" : "text-muted hover:text-fg"}`}>
          {n.label}
          {active(n.href) && <span className="absolute inset-x-1 bottom-0 h-1 bg-accent" aria-hidden />}
        </Link>
      ))}
    </nav>
  );
}

/** UTC wall clock in the header: the reference every session time is published in. */
export function UtcClock() {
  const now = useNow(1000);
  return (
    <span className="mono hidden items-center border-l-2 border-border pl-3 text-xs text-muted lg:flex" aria-hidden>
      UTC&nbsp;<span className="text-fg">{now ? now.toISOString().slice(11, 19) : "--:--:--"}</span>
    </span>
  );
}
