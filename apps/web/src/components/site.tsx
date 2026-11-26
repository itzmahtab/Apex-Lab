import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand";
import { NavLinks, UtcClock } from "@/components/nav-links";
import { cn } from "@/lib/cn";

export const PageContainer = ({ children, className }: { children: ReactNode; className?: string }) => (
  <main id="main" className={cn("mx-auto w-full max-w-[1280px] px-4 sm:px-6 py-8 flex-1", className)}>{children}</main>
);

/** Same width and gutters as PageContainer, without the <main> landmark (for pages with several bands). */
export const Container = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("mx-auto w-full max-w-[1280px] px-4 sm:px-6", className)}>{children}</div>
);

export function AppHeader() {
  return (
    <header className="sticky top-0 z-[100] border-b-2 border-border-strong bg-bg">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[500] focus:bg-accent focus:px-3 focus:py-2 focus:text-bg">Skip to content</a>
      <div className="mx-auto flex min-h-14 max-w-[1280px] flex-wrap items-stretch justify-between gap-x-4 px-4 sm:px-6">
        <Link href="/" className="misprint flex items-center gap-2.5 py-2 text-lg uppercase leading-none tracking-tight" aria-label="ApexLab home">
          <LogoMark />
          <span>Apex<span className="text-accent">/</span>Lab</span>
        </Link>
        <div className="flex items-stretch gap-3">
          <NavLinks />
          <UtcClock />
        </div>
      </div>
    </header>
  );
}

export function AppFooter() {
  return (
    <footer className="mt-24 border-t-2 border-border-strong">
      <div className="overflow-hidden border-b border-border" aria-hidden>
        <p className="outline-text -mb-[0.18em] select-none whitespace-nowrap px-2 text-[clamp(4rem,17vw,15rem)] uppercase leading-none tracking-tighter">Apex/Lab</p>
      </div>
      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-10 text-sm text-muted sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div className="max-w-xl space-y-3">
          <p className="text-fg">Independent, unofficial fan project.</p>
          <p>Not affiliated with, endorsed by or connected to Formula 1, the FIA, or any team or driver.</p>
          <p className="mono text-xs text-subtle">DATA / <a className="underline underline-offset-4 hover:text-fg" href="https://openf1.org" rel="noopener noreferrer">OpenF1</a> · <a className="underline underline-offset-4 hover:text-fg" href="https://jolpi.ca" rel="noopener noreferrer">Jolpica</a> — unofficial community APIs</p>
        </div>
        <nav aria-label="Footer"><ul className="grid grid-cols-2 gap-x-8 gap-y-2 uppercase">
          {[["/", "Season"], ["/live", "Live timing"], ["/compare", "Compare"], ["/events", "Calendar"], ["/methodology", "Methodology"], ["/about", "About"], ["/privacy", "Privacy"], ["/terms", "Terms"]].map(([h, l]) =>
            <li key={h}><Link className="hover:text-accent" href={h!}>{l}</Link></li>)}
        </ul></nav>
      </div>
    </footer>
  );
}
