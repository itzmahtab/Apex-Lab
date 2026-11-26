"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useNow } from "@/components/clock";
import { fmt12 } from "@/lib/geo";

const NAV = [
  { href: "/", label: "Season" },
  { href: "/live", label: "Live" },
  { href: "/compare", label: "Compare" },
  { href: "/events", label: "Calendar" },
  { href: "/methodology", label: "Method" },
];

export function NavLinks() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (h: string) => (h === "/" ? path === "/" || path.startsWith("/gp") : path.startsWith(h));
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <nav aria-label="Primary" className="hidden items-stretch md:flex">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}
            className={`relative flex items-center px-3 text-sm uppercase tracking-wide transition-colors duration-200 ${active(n.href) ? "text-fg" : "text-muted hover:text-fg"}`}>
            {n.label}
            {active(n.href) && <span className="absolute inset-x-1 bottom-0 h-1 bg-accent" aria-hidden />}
          </Link>
        ))}
      </nav>

      {/* small screens: one hard button, a full-width slab of big links */}
      <button type="button" className="stamp my-2 flex items-center gap-2 border-2 border-border-strong px-3 text-[11px] md:hidden"
        aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((o) => !o)}>
        <span className="flex w-4 flex-col gap-[3px]" aria-hidden>
          <span className={`h-[2px] bg-fg transition-transform duration-200 ${open ? "translate-y-[5px] rotate-45" : ""}`} />
          <span className={`h-[2px] bg-fg transition-opacity duration-200 ${open ? "opacity-0" : ""}`} />
          <span className={`h-[2px] bg-fg transition-transform duration-200 ${open ? "-translate-y-[5px] -rotate-45" : ""}`} />
        </span>
        {open ? "Close" : "Menu"}
      </button>
      {open && (
        <nav id="mobile-nav" aria-label="Primary" className="fixed inset-x-0 top-[58px] z-[200] border-b-2 border-border-strong bg-bg md:hidden">
          <ul>
            {NAV.map((n, i) => (
              <li key={n.href} className="rise border-t border-border" style={{ ["--i" as string]: i }}>
                <Link href={n.href} aria-current={active(n.href) ? "page" : undefined}
                  className={`flex items-center justify-between px-4 py-4 text-2xl uppercase ${active(n.href) ? "bg-accent text-bg" : "text-fg"}`}>
                  {n.label}<span className="mono text-xs">{String(i + 1).padStart(2, "0")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}

/** UTC wall clock in the header: the reference every session time is published in. */
export function UtcClock() {
  const now = useNow(1000);
  return (
    <span className="mono hidden items-center border-l-2 border-border pl-3 text-xs text-muted lg:flex" aria-hidden>
      UTC&nbsp;<span className="text-fg">{now ? fmt12(now, "UTC", true) : "--:--:-- --"}</span>
    </span>
  );
}
