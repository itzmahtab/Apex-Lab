/**
 * Same-origin proxy for F1 media-CDN images (car renders, driver portraits).
 * Browsers only ever talk to this site, so images still show where media.formula1.com is blocked,
 * throttled or filtered by a content blocker. Only F1 Cloudinary image paths are accepted (no
 * arbitrary URLs), and responses are cached at the Cloudflare edge for a week.
 */
const ALLOWED = /^image\/upload\/[A-Za-z0-9_:,./-]+\/common\/f1\/\d{4}\/[a-z0-9]+\/(?:[a-z0-9]+\/)?\d{4}[a-z0-9]+right\.webp$/;
const TTL = 7 * 86400;

type EdgeCache = { match(r: Request): Promise<Response | undefined>; put(r: Request, res: Response): Promise<void> };
const edgeCache = (): EdgeCache | null => (globalThis as unknown as { caches?: { default?: EdgeCache } }).caches?.default ?? null;

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.map(decodeURIComponent).join("/");
  if (!ALLOWED.test(path) || path.includes("..")) return new Response("Not an F1 image path", { status: 400 });

  const cache = edgeCache();
  const key = new Request(new URL(req.url).origin + "/api/f1-image/" + path);
  const hit = await cache?.match(key).catch(() => undefined);
  if (hit) return hit;

  let upstream: Response;
  try {
    upstream = await fetch(`https://media.formula1.com/${path}`, { headers: { accept: "image/webp,image/*" }, signal: AbortSignal.timeout(15_000) });
  } catch {
    return new Response("Image source unreachable", { status: 502 });
  }
  if (!upstream.ok || !upstream.headers.get("content-type")?.startsWith("image/")) return new Response("Image not found", { status: 404 });

  const res = new Response(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type")!,
      "cache-control": `public, max-age=${TTL}, s-maxage=${TTL}, immutable`,
    },
  });
  if (cache) await cache.put(key, res.clone()).catch(() => undefined);
  return res;
}
