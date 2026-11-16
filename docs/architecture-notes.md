# Implementation notes

## Packages

| Path | Role |
|---|---|
| `apps/web` | Next.js 16 App Router. Pages, route handlers, server-rendered SVG track map, Recharts telemetry. |
| `packages/contracts` | Zod schemas for every boundary: artifacts, session detail, queries, comparison result, error codes. |
| `packages/analytics` | Pure engine: lap normalisation (distance from speed), length-normalised alignment, deltas, mini-sectors, track map, summary text. |
| `packages/openf1` | Typed OpenF1 client (Zod-validated, rate-aware queue, retry/backoff, in-flight de-dup, pluggable cache) and the adapter to the contracts. |
| `packages/db` | Drizzle schema, SQL migration and idempotent seed. Kept for ingestion-side storage and saved comparisons; **not used by the deployed Worker**. |
| `services/ingestion` | Python CLI: synthetic demo fixtures, OpenF1 lap snapshots, artifact validation, atomic idempotent writes. |

## Request flow

```
page / route ─► Repository (lazy) ─► RoutedRepository ─┬─ "demo-*" keys ─► FixtureRepository (bundled JSON)
                                                       └─ everything else ─► OpenF1Repository
                                                                              └─ OpenF1Client ─► cache: memory → (KV | disk) ─► api.openf1.org
```

- The repository is **lazy** (seasons → events → session detail → lap telemetry) because a full real catalogue is too large to load at once.
- **Caching:** an in-memory LRU per isolate, plus a durable layer. In production that's Cloudflare KV (`OPENF1_CACHE` binding). In local dev it's a disk cache when `OPENF1_CACHE_DIR` is set. Completed sessions get 30 days; calendars get an hour.
- **Rate limit:** OpenF1's free tier allows a few requests per second and a per-minute cap. The client spaces requests 350 ms apart, retries 429/5xx with backoff, and fails fast with `UPSTREAM_UNAVAILABLE` (HTTP 503) instead of hanging when asked to wait more than 4 s.
- A cold comparison costs ~8 upstream calls: session, meeting, drivers, laps, stints, 2× car data, 1× location. The track only needs one lap's positions.

## Calculations

See `/methodology` in the app. The key decision: OpenF1 has no distance channel, so distance is integrated from speed and both laps are scaled to their mean length. That makes the finish-line gap equal the official lap-time delta, which is covered by a test and was verified live (Monaco 2024 Q: +0.154 s).

## Decisions

- **Real data via OpenF1, fetched at request time with caching.** This replaced "Python ingestion only" for the web, because pre-ingesting every session would exceed Worker bundle limits. Python keeps offline snapshots and validation, mirroring the TS normalisation.
- **FastF1 not used:** its upstream (F1 live timing) returned 401 from the build environment.
- **Postgres is not in the request path.** The deployed Worker has no database, and URLs are the share mechanism.
- **Share links are URLs:** `/compare?session=&a=&la=&b=&lb=`. A partial URL (`?session=…&a=…&b=…`) is completed server-side (fastest laps) and redirected to its canonical form.

## Cloudflare deployment

- `pnpm --filter @apexlab/web cf:deploy` builds with `@opennextjs/cloudflare`, embeds static assets, and runs `wrangler deploy`. It needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
- Static assets are embedded in the Worker (`worker-entry.ts`, `scripts/embed-assets.mjs`) because the Workers Assets upload could not be used through the credential proxy in the build environment. With a normal token, switching back to the `assets` binding is preferable.
- The demo fixtures are bundled via `scripts/bundle-fixtures.mjs` → `src/server/fixtures.bundle.json`.
