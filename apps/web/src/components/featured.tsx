import Link from "next/link";
import { FEATURED } from "@/server/comparison";
import { pairColours } from "@/lib/colors";
import { LineKey } from "@/components/driver";
import { ArrowRightIcon } from "@/components/icons";

export function FeaturedGrid() {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
      {FEATURED.map((f, i) => {
        const c = pairColours(f.aColour, f.bColour);
        return (
          <li key={f.session} className={i === 0 ? "lg:col-span-3 lg:row-span-3" : "lg:col-span-3"}>
            <Link href={`/compare?session=${f.session}&a=${f.a}&b=${f.b}`}
              className={`distort group relative flex h-full flex-col overflow-hidden rounded-lg border-2 border-border-strong p-5 ${i === 0 ? "bg-bone text-bg shadow-[6px_6px_0_var(--color-cobalt)] sm:p-8" : "bg-surface shadow-[4px_4px_0_var(--color-cobalt)]"}`}>
              <span className={`mono text-xs ${i === 0 ? "text-bg" : "text-subtle"}`}>{String(i + 1).padStart(2, "0")} / {f.event.toUpperCase()}</span>
              <span className={`mt-2 uppercase leading-tight ${i === 0 ? "text-[clamp(1.6rem,3vw,2.6rem)] leading-[0.95]" : "text-base"}`}>{f.title}</span>
              <span className={`mt-2 flex-1 text-sm leading-relaxed ${i === 0 ? "text-bg" : "text-muted"}`}>{f.blurb}</span>
              <span className={`num mt-4 flex items-center gap-3 rounded border-2 px-2 py-1.5 text-sm ${i === 0 ? "border-bg bg-bg" : "border-border bg-bg"}`}>
                <span className="inline-flex items-center gap-1.5 text-fg"><LineKey colour={c.a} />{f.aAbbr}</span>
                <span className="text-subtle">vs</span>
                <span className="inline-flex items-center gap-1.5 text-fg"><LineKey colour={c.b} dashed />{f.bAbbr}</span>
                <ArrowRightIcon className="ml-auto h-4 w-4 text-muted" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
