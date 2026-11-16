import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand";
import { cn } from "@/lib/cn";

export const PageContainer = ({ children, className }: { children: ReactNode; className?: string }) => (
  <main id="main" className={cn("mx-auto w-full max-w-[1280px] px-4 sm:px-6 py-8 flex-1", className)}>{children}</main>
);

const NAV = [
  { href: "/compare", label: "Compare" },
  { href: "/events", label: "Calendar" },
  { href: "/methodology", label: "Methodology" },
];

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/75 backdrop-blur-xl">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-elevated focus:px-3 focus:py-2">Skip to content</a>
      <div className="mx-auto flex min-h-14 max-w-[1280px] flex-wrap items-center justify-between gap-x-4 px-4 py-1 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight" aria-label="ApexLab home">
          <LogoMark />
          <span className="text-[17px]">Apex<span className="text-accent">Lab</span></span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-2.5 py-2 text-sm text-muted transition-colors hover:bg-elevated hover:text-fg sm:px-3">{n.label}</Link>
          ))}
          <span className="ml-2 hidden items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-throttle" aria-hidden /> Real data · OpenF1
          </span>
        </nav>
      </div>
    </header>
  );
}

export function AppFooter() {
  return (
    <footer className="mt-16 border-t border-border/70">
      <div className="mx-auto grid max-w-[1280px] gap-6 px-4 py-10 text-sm text-muted sm:px-6 md:grid-cols-[1fr_auto]">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 text-fg"><LogoMark className="h-5 w-5" /> <span className="font-semibold">ApexLab</span></div>
          <p>Independent, unofficial fan project. Not affiliated with, endorsed by or connected to Formula 1, the FIA, or any team or driver.</p>
          <p className="text-subtle">Timing and telemetry from <a className="underline underline-offset-4 hover:text-fg" href="https://openf1.org" rel="noopener noreferrer">OpenF1</a>, an unofficial community API.</p>
        </div>
        <nav aria-label="Footer"><ul className="grid grid-cols-2 gap-x-8 gap-y-2">
          {[["/compare", "Compare"], ["/events", "Calendar"], ["/methodology", "Data & methodology"], ["/about", "About"], ["/privacy", "Privacy"], ["/terms", "Terms"]].map(([h, l]) =>
            <li key={h}><Link className="hover:text-fg" href={h!}>{l}</Link></li>)}
        </ul></nav>
      </div>
    </footer>
  );
}
