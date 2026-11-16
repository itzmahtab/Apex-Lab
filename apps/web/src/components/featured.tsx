import Link from "next/link";
import { FEATURED } from "@/server/comparison";
import { pairColours } from "@/lib/colors";
import { LineKey } from "@/components/driver";

export function FeaturedGrid() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {FEATURED.map((f) => {
        const c = pairColours(f.aColour, f.bColour);
        return (
          <li key={f.session}>
            <Link href={`/compare?session=${f.session}&a=${f.a}&b=${f.b}`}
              className="group flex h-full flex-col rounded-2xl border border-border bg-surface/80 p-5 transition-all hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface">
              <span className="text-xs text-subtle">{f.event}</span>
              <span className="mt-2 font-semibold leading-snug group-hover:text-white">{f.title}</span>
              <span className="mt-1 flex-1 text-sm text-muted">{f.blurb}</span>
              <span className="mt-4 flex items-center gap-3 text-sm font-semibold num">
                <span className="inline-flex items-center gap-1.5" style={{ color: c.a }}><LineKey colour={c.a} />{f.aAbbr}</span>
                <span className="text-subtle">vs</span>
                <span className="inline-flex items-center gap-1.5" style={{ color: c.b }}><LineKey colour={c.b} dashed />{f.bAbbr}</span>
                <span className="ml-auto text-muted transition-transform group-hover:translate-x-1" aria-hidden>→</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
