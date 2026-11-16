# ApexLab F1 --- Architecture

## 1. Architecture principles

-   Build a modular monolith first; do not create unnecessary
    microservices.
-   Next.js is the web application and API boundary.
-   Python owns FastF1 ingestion and numerical processing.
-   PostgreSQL stores relational metadata and compact analysis records.
-   Large telemetry artifacts belong in local files during development
    and object storage such as R2 later.
-   Demo fixtures must make local development deterministic.
-   Provider-specific code must be isolated behind adapters.
-   No paid API is required for the local MVP.

## 2. Selected stack

### Web

-   Next.js 16+ App Router
-   React and TypeScript
-   Tailwind CSS
-   shadcn/ui
-   Motion for React (`motion`) for restrained interface animation
-   Recharts for standard charts
-   Zod for input/output validation
-   Drizzle ORM and PostgreSQL driver

### Data processing

-   Python 3.12+ (choose a version compatible with the installed FastF1
    release)
-   FastF1
-   pandas and NumPy
-   Pydantic for artifact validation where useful
-   pytest for Python tests

### Storage and tools

-   PostgreSQL locally via Docker or a local installation
-   Neon free tier optionally for a later hosted database
-   Cloudflare Workers/Pages depending on the chosen Next.js adapter and
    supported features
-   Cloudflare R2 optionally for generated assets
-   GitHub Actions for CI and later scheduled jobs
-   Vitest for TypeScript unit tests
-   Playwright for browser-level tests in a later phase

Always verify current provider limits and adapter compatibility before
choosing production deployment settings.

## 3. High-level diagram

``` mermaid
flowchart TD
    UI[Next.js UI] --> ROUTES[Next.js route handlers / server functions]
    ROUTES --> REPO[Typed repository layer]
    REPO --> DB[(PostgreSQL)]
    UI --> CHARTS[Telemetry chart components]
    INGEST[Python ingestion CLI] --> ADAPTER[Data source adapter]
    ADAPTER --> FASTF1[FastF1 when permitted]
    ADAPTER --> FIXTURES[Demo fixtures]
    FASTF1 --> NORMALIZE[Normalize and validate]
    FIXTURES --> NORMALIZE
    NORMALIZE --> CALC[Comparison calculations]
    CALC --> ARTIFACT[Versioned telemetry artifacts]
    CALC --> DB
    ARTIFACT --> STORAGE[Local artifacts initially / R2 later]
```

## 4. Runtime boundaries

### Next.js

Responsible for: - Public pages and navigation. - Validating comparison
query parameters. - Loading prepared session/lap metadata. - Returning
compact chart-ready data. - Generating share-card HTML/image output
where the selected runtime supports it. - Handling cache headers and
error states.

Not responsible for: - Loading entire FastF1 sessions during a user
request. - Running pandas/NumPy calculations in a Cloudflare Worker. -
Fetching untrusted arbitrary URLs supplied by a user. - Storing huge
telemetry arrays inside ordinary page metadata.

### Python ingestion CLI

Responsible for: - Reading an explicit event/session request. - Loading
data from an approved source. - Using FastF1 caching. - Normalizing
times, units, missing values, and driver identifiers. - Calculating
chart-ready comparison artifacts. - Writing a versioned JSON artifact
and/or importing metadata. - Logging status and errors without exposing
secrets.

### PostgreSQL

Stores: - Seasons, events, sessions, drivers, lap summaries. - Artifact
references and processing status. - Saved comparisons and optional
future user data.

### Artifact storage

During local development, use a project data directory excluded from Git
for generated files. Include only small, redistributable fixtures in the
repository. Later, move suitable generated assets to R2 if needed and if
permitted by data rights.

## 5. Data flow

1.  Developer selects a known fixture or explicitly requests a session.
2.  Ingestion adapter loads source data.
3.  Normalization converts durations to integer milliseconds and records
    units.
4.  Validation rejects malformed records and records incomplete
    telemetry.
5.  Calculation layer aligns selected lap samples by distance or a
    documented normalized distance axis.
6.  Artifact writer produces a schema-versioned JSON document.
7.  Metadata is written to PostgreSQL.
8.  Next.js reads metadata and the selected artifact, validates it, and
    returns only the required series.
9.  UI renders charts and a deterministic textual summary.

## 6. Comparison mathematics

-   Lap delta: `lapB_ms - lapA_ms`. Document which driver is A and B.
    Positive means B's lap took longer than A's.
-   Sector delta: `sectorB_ms - sectorA_ms` for each sector.
-   Distance alignment: use a documented distance coordinate; do not
    assume telemetry sample indices correspond between drivers.
-   If samples need interpolation, use a deterministic method and
    preserve the original data. Avoid implying that interpolation
    creates additional measured precision.
-   Filter invalid laps only when the selected analysis requires it, and
    show the filtering rule.
-   Missing fields should be represented as null/absent, not fabricated
    zeroes.

## 7. API shape

Suggested initial routes: - `GET /api/seasons` -
`GET /api/events?season=2026` - `GET /api/sessions?eventId=...` -
`GET /api/sessions/:sessionId/drivers` -
`GET /api/comparisons/data?sessionId=...&driverA=...&lapA=...&driverB=...&lapB=...` -
`POST /api/comparisons` to save a shareable comparison if persistence is
enabled. - `GET /api/comparisons/:slug`

All parameters must be validated with Zod. Return stable error codes and
useful messages. Never allow arbitrary file paths or object keys to be
supplied directly by the client.

## 8. Caching

-   Cache source files through FastF1's cache mechanism.
-   Cache normalized artifacts by session, driver, lap, and artifact
    schema version.
-   Cache public comparison responses using stable identifiers.
-   Use a short or no cache for mutable processing status; use longer
    cache for immutable completed-session artifacts.
-   Invalidate only the affected artifact after recalculation.
-   Never cache private user data publicly.

## 9. Deployment direction (future phase)

The local MVP must work before deployment is attempted. For a future
Cloudflare deployment, validate the Next.js adapter against the exact
features used. Use GitHub Actions or another permitted Python runtime
for batch ingestion; do not assume Workers can run FastF1. Use
environment variables for database URLs and secrets. Keep a fallback
path to a conventional Node host if a required Next.js capability is
unsupported.

## 10. Free-tier philosophy

"Free" means free within provider quotas and current terms, not
unlimited. Keep the system functional without paid APIs, avoid always-on
Python services, process data in batches, and design a local mode that
does not require a cloud account.
