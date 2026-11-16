# ApexLab F1 --- Implementation Phases

## Operating constraint

**Current objective: make the project workable locally.** Do not spend
the initial build on production deployment, load testing, AdSense, or
advanced monitoring. Deployment and formal testing are planned later,
after the local product flow works.

The plan contains 14 phases from zero to deployment. Phases 1--10 build
the local product; phases 11--14 are the later validation and release
stages.

## Phase 1 --- Scope, repository, and data-rights gate

Tasks: - Confirm the MVP: select session, compare two laps, charts,
shareable URL. - Review data-source terms and intended public/commercial
use. - Create repository and initial README. - Decide how synthetic
fixtures will be labelled. - Record open questions in
`docs/data-rights.md`.

Deliverables: - Initial repository. - Clear MVP boundaries. - Data
rights checklist. - Demo-data policy.

Exit criterion: development can proceed without assuming unverified
commercial rights.

## Phase 2 --- Local development foundation

Tasks: - Install Node.js LTS compatible with Next.js 16+ and pnpm. -
Create Next.js App Router app with TypeScript. - Configure Tailwind CSS
and shadcn/ui. - Configure linting, formatting, strict TypeScript. - Add
environment variable validation and `.env.example`. - Create Python
virtual environment and dependency file. - Add root scripts and setup
documentation.

Deliverables: - Web app starts locally. - Python environment installs. -
CI runs basic static checks.

Exit criterion: a new developer can follow README setup without
undocumented steps.

## Phase 3 --- Design shell and navigation

Tasks: - Create color tokens, typography, spacing and layout
primitives. - Build header, footer, responsive container and
navigation. - Build home page with clear compare CTA. - Create empty,
loading and error state components. - Add reduced-motion behavior.

Deliverables: - Responsive visual shell. - Reusable UI components.

Exit criterion: all main routes can be navigated locally, even if using
fixtures.

## Phase 4 --- Database and shared contracts

Tasks: - Configure PostgreSQL and Drizzle. - Create seasons, events,
sessions, drivers, laps, telemetry_artifacts, comparisons, share_assets
and processing_jobs. - Create migrations and seed scripts. - Define Zod
contracts for API requests and comparison output. - Document the
telemetry artifact JSON schema.

Deliverables: - Reproducible schema. - Seeded demo metadata. - Shared
TypeScript contracts.

Exit criterion: sample metadata can be seeded, queried and validated.

## Phase 5 --- Demo fixture and repository layer

Tasks: - Create a small synthetic fixture with two drivers and several
lap samples. - Label fixture source as synthetic demo. - Implement
repositories for seasons, events, sessions, drivers, laps and
artifacts. - Add a demo mode that works without a FastF1 download. -
Keep fixture data small and suitable for version control.

Deliverables: - Fully deterministic local data source. - Database and
fixture adapters.

Exit criterion: UI work does not depend on network access or live data
availability.

## Phase 6 --- Python ingestion skeleton

Tasks: - Create source adapter interface. - Add FastF1 adapter behind a
feature/configuration boundary. - Implement source cache
configuration. - Normalize IDs, lap times, sector times and telemetry
units. - Validate required fields and report missing signals. - Write
versioned artifacts atomically. - Add CLI arguments and structured logs.

Deliverables: - Python ingestion command. - Artifact validator. - Clear
failure messages.

Exit criterion: demo fixture ingestion works; FastF1 ingestion is
attempted only with an approved, available data source and is not
required for the UI to work.

## Phase 7 --- Calculation engine

Tasks: - Implement lap-time delta. - Implement sector deltas. -
Implement telemetry alignment by distance. - Implement missing-value and
invalid-lap handling. - Record calculation version and methodology. -
Add pytest fixtures with known expected outputs.

Deliverables: - Small, pure calculation functions. - Calculation
documentation.

Exit criterion: all expected calculations pass local unit tests and sign
conventions are documented.

## Phase 8 --- Comparison APIs and data access

Tasks: - Implement season/event/session selectors. - Add routes for
metadata and comparison data. - Validate query parameters with Zod. -
Return only chart-ready fields. - Add safe error codes and not-found
handling. - Add cache policy for immutable completed-session artifacts.

Deliverables: - Working local API. - Typed data access. - Controlled
error states.

Exit criterion: comparison data can be loaded from the API with demo
data and without arbitrary file-path access.

## Phase 9 --- Interactive telemetry experience

Tasks: - Build driver and lap selectors. - Display lap time and overall
delta. - Add sector comparison table. - Add speed vs distance chart. -
Add throttle and brake charts where available. - Add legends, units,
tooltips and data source notices. - Handle partial, missing and invalid
data.

Deliverables: - End-to-end compare page.

Exit criterion: a user can select two demo laps and understand the
result on desktop and mobile.

## Phase 10 --- Shareable comparison and local MVP finish

Tasks: - Create stable comparison URLs or database-backed slugs. -
Reconstruct selections from a shared URL. - Build share-card preview and
downloadable/copy-link action. - Add metadata and a safe Open Graph
fallback. - Polish loading/empty/error states. - Update README and local
runbook. - Verify the core workflow manually during development.

Deliverables: - Working local MVP. - Shareable comparison flow. - Clear
setup and architecture documentation.

Exit criterion: the local product can be demonstrated end-to-end using
demo data. Stop here for the initial build.

## Phase 11 --- Dedicated testing pass (later)

Do not start until the local MVP is workable. - Expand unit and
integration tests. - Test API validation, missing fields and database
failures. - Test artifact version compatibility. - Test duplicate
ingestion and failed-job recovery. - Add Playwright browser journeys. -
Test keyboard navigation and reduced motion.

Exit criterion: core journeys and failure cases have repeatable
automated coverage.

## Phase 12 --- Production architecture and deployment rehearsal (later)

-   Confirm the current Next.js 16+ Cloudflare adapter and feature
    support.
-   Configure production database and migrations.
-   Choose Python batch execution environment.
-   Configure secrets and object storage if needed.
-   Add cache headers, rate limits and backups.
-   Test rollback and recovery procedures.

Exit criterion: a reproducible staging deployment can be created without
exposing secrets.

## Phase 13 --- Deploy and verify (later)

-   Deploy web app.
-   Run migrations.
-   Deploy the ingestion job.
-   Verify routes, database connectivity and artifact loading.
-   Verify social preview images and canonical URLs.
-   Check mobile performance and accessibility.
-   Confirm data rights and public-content permissions.

Exit criterion: production app is stable for a small public beta.

## Phase 14 --- Audience and monetization (later)

-   Publish original, rights-cleared analysis pages.
-   Add privacy-conscious analytics.
-   Measure completed comparisons and share conversion.
-   Improve pages based on real use.
-   Review AdSense eligibility and policies.
-   Consider sponsorships or premium tools only after audience
    validation.

Exit criterion: audience growth and monetization decisions are based on
real behavior, not assumptions.

## Definition of done for the current request

The current build is complete when phases 1--10 are implemented, the
project runs locally, demo data works, the core comparison is usable,
and the share flow works. Do not claim deployment or production testing
is complete until phases 11--13 have actually been executed.
