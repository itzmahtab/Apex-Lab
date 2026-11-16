import "server-only";
import { NextResponse } from "next/server";
import { errorBody } from "./errors";

const CACHE = {
  /** Completed-session data never changes. */
  immutable: "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
  /** Calendars and session lists change during a season. */
  short: "public, max-age=60, s-maxage=600",
  none: "no-store",
} as const;

export async function json<T>(fn: () => Promise<T>, cache: keyof typeof CACHE = "immutable") {
  try {
    return NextResponse.json(await fn(), { headers: { "Cache-Control": CACHE[cache] } });
  } catch (e) {
    const { body, status } = errorBody(e);
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  }
}
