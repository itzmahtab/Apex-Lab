import "server-only";
import { NextResponse } from "next/server";
import { errorBody } from "./errors";

const IMMUTABLE = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

export async function json<T>(fn: () => Promise<T>, cache: "immutable" | "none" = "immutable") {
  try {
    const data = await fn();
    return NextResponse.json(data, { headers: { "Cache-Control": cache === "immutable" ? IMMUTABLE : "no-store" } });
  } catch (e) {
    const { body, status } = errorBody(e);
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  }
}
