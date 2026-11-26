# ApexLab F1 --- Engineering Rules

## 1. Product rules

1.  The first milestone is a working local application, not a deployed
    site.
2.  Finish the compare-and-share workflow before adding accounts,
    leagues, AI, or ads.
3.  Use demo data whenever the real data source is unavailable or not
    cleared for the intended use.
4.  Clearly label demo data and never present invented values as real
    race results.
5.  Every chart must have units, labels, a legend, and a useful empty
    state.
6.  No feature should imply official Formula 1 affiliation.

## 2. Stack rules

-   Use Next.js 16+ App Router and TypeScript.
-   Use Tailwind CSS and shadcn/ui for interface primitives.
-   Use Motion for React for purposeful animation, not decoration
    everywhere.
-   Use Recharts for standard line/area charts; evaluate a specialized
    chart library only if performance requires it.
-   Use Zod for request and response validation.
-   Use Drizzle ORM for typed PostgreSQL access and migrations.
-   Use Python for FastF1 ingestion and numeric processing.
-   Keep FastF1 and scientific Python dependencies out of the Next.js
    runtime.
-   Prefer free tools and local development; never require a paid AI API
    for core features.

## 3. TypeScript rules

-   Enable strict TypeScript.
-   Avoid `any`; use `unknown` at untrusted boundaries and narrow it.
-   Keep API contracts in a shared package.
-   Validate URL parameters and JSON input.
-   Do not trust client-provided IDs without checking their existence
    and relationship.
-   Keep server-only modules marked and never import secrets into client
    components.
-   Use server components by default; use client components only for
    interactivity.
-   Avoid duplicated business logic between components and route
    handlers.
-   Use consistent error response objects with stable error codes.

## 4. Python rules

-   Use type hints and small, testable functions.
-   Separate source adapters, normalization, calculations, and artifact
    writing.
-   Do not mix HTTP/CLI concerns into numerical calculation functions.
-   Convert time values to integer milliseconds at the normalized
    boundary.
-   Document units and coordinate systems for every telemetry field.
-   Handle missing values explicitly.
-   Never convert missing measurements into zero.
-   Make ingestion idempotent and safe to rerun.
-   Write artifacts atomically.
-   Log source, session ID, processing version, duration, and error
    category.
-   Never log secrets or private connection strings.

## 5. Data correctness rules

-   Keep raw/source data separate from normalized outputs.
-   Record source provenance and retrieval time.
-   Version artifact schemas and calculation logic.
-   Document whether laps are valid, deleted, incomplete, or otherwise
    filtered.
-   Do not compare telemetry samples by array index unless the source
    explicitly guarantees alignment.
-   Use a shared distance coordinate or a documented alignment
    algorithm.
-   Use deterministic summary logic for MVP; AI is not required.
-   Include a methodology note beside interpretations.
-   Treat derived data as subject to the applicable source rights and
    terms.

## 6. Database rules

-   Use migrations for every schema change.
-   Use foreign keys and unique constraints.
-   Use integer milliseconds for lap and sector times.
-   Use stable internal IDs plus external source keys.
-   Add indexes based on actual query patterns.
-   Keep bulky telemetry arrays out of ordinary relational tables.
-   Do not add authentication tables until authentication is actually
    implemented.
-   Store timestamps in UTC and convert for display at the UI boundary.

## 7. UI and accessibility rules

-   Mobile-first responsive layout.
-   Support keyboard navigation and visible focus states.
-   Use semantic headings and buttons.
-   Do not communicate driver identity by color alone.
-   Respect reduced-motion preferences.
-   Animation must not delay core interactions.
-   Keep contrast readable on dark and light surfaces.
-   Charts need textual summaries or accessible data alternatives.
-   Always include loading, empty, partial-data, and error states.

## 8. Security and privacy rules

-   Commit `.env.example`, never real `.env` secrets.
-   Validate all external inputs.
-   Restrict CORS only if cross-origin API use is required; do not
    enable broad permissive settings by default.
-   Add rate limiting before exposing expensive public endpoints.
-   Never allow user-supplied paths or arbitrary URLs to reach
    file/network readers.
-   Avoid collecting personal data in the MVP.
-   If accounts are added, implement deletion and privacy controls.
-   Publish privacy and terms pages before commercial public launch.

## 9. Testing rules

The initial build must include calculation and schema tests. Full
browser testing and production load testing can occur in the later
testing phase, as requested.

-   Unit-test lap and sector delta calculations.
-   Test null/missing telemetry fields.
-   Test artifact validation.
-   Test duplicate ingestion behavior.
-   Use fixtures with known expected values.
-   Never rely only on live data downloads for tests.
-   Do not claim a feature is tested if it has not been run.

## 10. Git and workflow rules

-   Use small, descriptive commits.
-   Keep changes scoped to one phase when possible.
-   Update docs when data contracts or commands change.
-   Do not commit generated large datasets or downloaded source caches.
-   Do not introduce new dependencies without explaining the need.
-   Keep the local app runnable after each completed phase.

## 11. Rights and monetization rules

-   Verify data rights before public commercial use.
-   Do not use unlicensed F1 logos, video, or broadcast clips. Exception, by owner
    decision: official car and driver images hot-linked from F1's media CDN
    (never committed to the repo). See `docs/data-rights.md`.
-   Do not imply official affiliation.
-   A disclaimer does not replace permission.
-   Do not enable ads until content quality, policy compliance, privacy,
    and rights have been reviewed.
