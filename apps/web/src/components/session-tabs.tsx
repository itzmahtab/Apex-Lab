"use client";
import { useRef, useState } from "react";
import type { ResultTable } from "@/server/season";
import { ZonedTime } from "@/components/clock";

/** Accessible tabs (WAI-ARIA tab pattern) holding every session's classification. */
export function SessionTabs({ tables, tz }: { tables: ResultTable[]; tz: string }) {
  const lastDone = [...tables].reverse().find((t) => t.rows.length > 0);
  const [active, setActive] = useState(lastDone?.id ?? tables[0]?.id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const t = tables.find((x) => x.id === active) ?? tables[0];
  if (!t) return null;
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = tables[(i + d + tables.length) % tables.length]!;
    setActive(next.id); refs.current[next.id]?.focus();
  };
  return (
    <div>
      <div role="tablist" aria-label="Sessions" className="flex overflow-x-auto border-2 border-border-strong">
        {tables.map((x, i) => (
          <button key={x.id} ref={(el) => { refs.current[x.id] = el; }} role="tab" id={`tab-${x.id}`} aria-controls={`panel-${x.id}`}
            aria-selected={x.id === t.id} tabIndex={x.id === t.id ? 0 : -1} onClick={() => setActive(x.id)} onKeyDown={(e) => onKey(e, i)}
            className={`shrink-0 border-r-2 border-border px-4 py-2.5 text-xs uppercase transition-colors duration-200 last:border-r-0 ${x.id === t.id ? "bg-accent text-bg" : "text-muted hover:bg-elevated hover:text-fg"}`}>
            {x.label}{x.rows.length > 0 && <><span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-throttle align-middle" aria-hidden /><span className="sr-only"> (results available)</span></>}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} tabIndex={0} className="mt-5 rounded-lg border-2 border-border-strong bg-surface p-4 shadow-[8px_8px_0_var(--color-cobalt)] sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-xl uppercase">{t.label}</h3>
          <span className="text-sm text-muted"><ZonedTime iso={t.start} /> your time · <ZonedTime iso={t.start} tz={tz} withDay={false} /> local</span>
        </div>
        {t.rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted" role="status">{t.done ? "No classification published for this session." : "This session hasn't run yet. Results appear here once it finishes."}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <caption className="sr-only">{t.label} classification</caption>
              <thead><tr className="text-left text-xs text-subtle">
                <th scope="col" className="pb-2 pr-2 font-normal">Pos</th><th scope="col" className="pb-2 pr-3 font-normal">Driver</th>
                <th scope="col" className="hidden pb-2 pr-3 font-normal sm:table-cell">Team</th>
                {t.columns.map((c) => <th key={c} scope="col" className="pb-2 pl-3 text-right font-normal">{c}</th>)}
              </tr></thead>
              <tbody>
                {t.rows.map((r, i) => (
                  <tr key={`${r.code}-${i}`} className={`border-t border-border/70 ${i < 3 && /^\d+$/.test(r.position) ? "bg-white/[0.015]" : ""}`}>
                    <td className="py-2 pr-2 num text-subtle">{r.position}</td>
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2"><span className="h-4 w-1 shrink-0 rounded-full" style={{ background: r.colour }} aria-hidden /><b className="num">{r.code}</b><span className="hidden text-muted md:inline">{r.name}</span>
                        {r.highlight && <span className="rounded-full border border-purple/40 bg-purple/10 px-1.5 text-[10px] text-purple" title={r.highlight}>FL</span>}</span>
                    </td>
                    <td className="hidden py-2 pr-3 text-muted sm:table-cell">{r.team}</td>
                    {r.values.map((v, k) => <td key={k} className="py-2 pl-3 text-right num">{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-subtle">Source: {t.source}.{t.rows.some((r) => r.highlight) ? ` FL = fastest lap (${t.rows.find((r) => r.highlight)?.highlight?.replace("Fastest lap ", "")}).` : ""}</p>
      </div>
    </div>
  );
}
