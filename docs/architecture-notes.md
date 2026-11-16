# Implementation notes

- `packages/contracts` – Zod schemas (artifact, catalog, query, comparison result, errors). Single source of truth for TS.
- `packages/analytics` – pure calculation engine (deltas, distance alignment, summary). Vitest.
- `packages/db` – Drizzle schema, generated SQL migration (`migrations/`), idempotent seed from fixtures.
- `services/ingestion` – stdlib-only Python: demo source, validation, atomic writes, gated FastF1 stub, pytest.
- `apps/web` – Next.js 16 App Router. `server/repository.ts` is the data boundary (fixture or Postgres metadata; telemetry always from artifact files).

Decisions
- Pairwise comparison runs in TypeScript at request time (cheap, no pandas in the web runtime). Python owns ingestion/normalisation/validation; its `calc.py` mirrors the TS sign conventions and is covered by tests. Revisit duplication when real ingestion lands.
- Share links are URL-based (`/compare?session=&a=&la=&b=&lb=`), so no database is required. No `comparisons` rows are written yet (table exists for later).
- Brake is a percent signal in the demo data; the artifact `units.brake` field carries the kind.
- Dark theme only for now.
- Build emits a Turbopack warning about dynamic filesystem tracing in `repository.ts`; revisit in Phase 12 deployment work.

API: `GET /api/seasons`, `/api/events?season=`, `/api/sessions?eventId=`, `/api/sessions/:key/drivers`, `/api/comparisons/data?session&a&la&b&lb`, `/api/share-card?...[&download=1]`. Errors: `{error:{code,message}}`.
