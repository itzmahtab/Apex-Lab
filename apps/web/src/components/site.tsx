import Link from "next/link";
import type { ReactNode } from "react";

export const PageContainer = ({ children }: { children: ReactNode }) => (
  <main id="main" className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 py-8 flex-1">{children}</main>
);

const NAV = [{ href: "/compare", label: "Compare" }, { href: "/events", label: "Events" }, { href: "/methodology", label: "Methodology" }, { href: "/about", label: "About" }];

export function AppHeader() {
  return (
    <header className="border-b border-border bg-bg/90 backdrop-blur sticky top-0 z-20">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-elevated focus:px-3 focus:py-2 rounded">Skip to content</a>
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 min-h-14 py-1 flex flex-wrap items-center justify-between gap-x-4">
        <Link href="/" className="font-bold tracking-tight text-lg">Apex<span className="text-accent">Lab</span></Link>
        <nav aria-label="Primary"><ul className="flex flex-wrap gap-0 sm:gap-3 text-sm">
          {NAV.map((n) => <li key={n.href}><Link className="px-2 sm:px-3 py-2 inline-block rounded text-muted hover:text-fg" href={n.href}>{n.label}</Link></li>)}
        </ul></nav>
      </div>
    </header>
  );
}

export function AppFooter() {
  return (
    <footer className="border-t border-border mt-12">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-8 text-sm text-muted space-y-3">
        <nav aria-label="Footer"><ul className="flex flex-wrap gap-x-5 gap-y-2">
          {[["/about", "About"], ["/methodology", "Data & methodology"], ["/privacy", "Privacy"], ["/terms", "Terms"], ["/contact", "Contact"]].map(([h, l]) =>
            <li key={h}><Link className="hover:text-fg underline-offset-4 hover:underline" href={h!}>{l}</Link></li>)}
        </ul></nav>
        <p>ApexLab is an independent, unofficial fan project. It is not affiliated with, endorsed by, or connected to Formula 1, the FIA, or any team or driver.</p>
      </div>
    </footer>
  );
}
