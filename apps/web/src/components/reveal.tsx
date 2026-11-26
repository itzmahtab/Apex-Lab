"use client";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scroll reveal: a hard, stepped slide-in when the block enters the viewport.
 * Server markup is visible; the block is only hidden after mount, and only if it is still below the fold,
 * so content never disappears without JavaScript and nothing flashes on load.
 */
export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < innerHeight * 0.92) return;
    el.classList.add("reveal-pre");
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) { el.classList.remove("reveal-pre"); el.classList.add("reveal-in"); io.disconnect(); }
    }, { rootMargin: "0px 0px -12% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}
