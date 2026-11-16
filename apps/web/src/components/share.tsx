"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/fade-in";

export function CopyLinkButton({ path }: { path: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    const url = new URL(path, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      window.prompt("Copy this link:", url);
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2500);
  }
  return (
    <Button onClick={copy} variant="primary" aria-live="polite">
      {state === "copied" ? "Link copied ✓" : state === "failed" ? "Copy manually" : "Copy link"}
    </Button>
  );
}

/** Preview is the real server-rendered PNG, so what you see is what you download. */
export function ShareCardPreview({ query, alt }: { query: string; alt: string }) {
  return (
    <FadeIn className="space-y-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/share-card?${query}`} alt={alt} width={1200} height={630} loading="lazy"
        className="w-full max-w-xl rounded-lg border border-border aspect-[1200/630] bg-elevated" />
      <div className="flex flex-wrap gap-3">
        <CopyLinkButton path={`/compare?${query}`} />
        <a className="inline-flex items-center justify-center rounded-lg text-sm font-medium min-h-10 px-4 bg-elevated border border-border hover:bg-[#232a35]"
          href={`/api/share-card?${query}&download=1`} download="apexlab-comparison.png">Download card (PNG)</a>
      </div>
    </FadeIn>
  );
}
