# ApexLab F1 --- Project Memory

This file is the handoff note for future sessions or collaborators. Update it after each meaningful implementation phase.

## Project identity

-   Name: ApexLab F1
-   Tagline: The science behind the speed.
-   Product: Independent motorsport analytics and shareable driver/lap
    comparisons.
-   Primary goal: Build a viral fan website with future AdSense
    potential.
-   Main engineering goal: Demonstrate full-stack engineering with
    Next.js 16+ and Python.
-   Deployment preference: Cloudflare-first and free-first where
    practical.
-   Current priority: Make the project workable locally before
    deployment/testing work.

## Product decisions

-   MVP focus: select session, compare two drivers/laps, display lap and
    sector deltas, show telemetry charts, create stable share URL/card.
-   Demo fixtures are mandatory so local development does not depend on
    live data.
-   Demo data must always be labelled synthetic.
-   No accounts, prediction leagues, AI writing, live timing, ads, or
    paid features in the initial MVP.
-   Python ingestion is separate from the Next.js runtime.
-   Do not process FastF1 data during page requests.
-   Use a modular monolith, not a microservice architecture.
-   Data rights are a release gate for public/commercial data use.

## Chosen stack

-   Next.js 16+ App Router
-   TypeScript
-   Tailwind CSS
-   shadcn/ui
-   Motion for React
-   Recharts
-   Zod
-   Drizzle ORM
-   PostgreSQL
-   Python + FastF1 + pandas + NumPy
-   pytest and Vitest
-   GitHub Actions
-   Cloudflare Workers/Pages depending on current Next.js adapter
    compatibility
-   Cloudflare R2 only if object storage is needed
-   Neon may be used as a free-tier hosted PostgreSQL option later

Free tiers have quotas and can change. Avoid making core local
development depend on a cloud provider.

## Architecture decisions

-   Next.js serves pages and validated APIs.
-   Python CLI ingests, normalizes and calculates data.
-   PostgreSQL stores relational metadata.
-   Telemetry is stored in versioned JSON artifacts; large arrays do not
    go into ordinary rows.
-   Use integer milliseconds for lap and sector times.
-   Use documented distance alignment for telemetry comparisons.
-   Cache source, normalized artifacts and public web responses
    separately.
-   Preserve last known good artifact if a new ingestion job fails.

## Repository outline

-   `apps/web`: Next.js application.
-   `packages/db`: Drizzle schema, migrations and client.
-   `packages/contracts`: shared TypeScript validation contracts.
-   `packages/analytics`: reusable analytics helpers where useful.
-   `services/ingestion`: Python FastF1/data adapter pipeline.
-   `scripts`: seed, ingestion and artifact validation commands.
-   `docs`: architecture, data rights, contracts and runbooks.

## Implementation phases

1.  Scope, repository and data-rights gate.
2.  Local development foundation.
3.  Design shell and navigation.
4.  Database and shared contracts.
5.  Demo fixture and repository layer.
6.  Python ingestion skeleton.
7.  Calculation engine.
8.  Comparison APIs.
9.  Interactive telemetry experience.
10. Shareable comparison and local MVP finish.
11. Dedicated testing pass.
12. Deployment rehearsal.
13. Deploy and verify.
14. Audience and monetization.

Current request scope ends after phase 10: a workable local MVP. Testing
and deployment are future work.

## Rules for future work

-   Read this file and `phases.md` before continuing.
-   Ask for the current repository state or inspect the available
    project files; never assume a phase is complete.
-   Implement one phase at a time.
-   Keep the app runnable after each phase.
-   Do not silently replace the chosen stack.
-   Do not add dependencies without a clear reason.
-   Do not invent real F1 data for demo purposes.
-   Do not claim tests, deployment, licensing, or AdSense approval
    unless actually verified.
-   Update this file with completed phases, changed decisions, blockers,
    and next actions.

## Progress log

-   Phases 1-10 built (local MVP on synthetic data), then extended:
-   **Real data:** OpenF1 (free, public, 2023+) via `packages/openf1`. FastF1 is not used: its upstream
    (F1 live timing) returned 401 from the build environment.
-   **Deployed:** Cloudflare Workers via OpenNext, with a KV namespace `apexlab-openf1-cache`
    (binding `OPENF1_CACHE`). Live at https://apexlab.cou-hackathon.workers.dev.
-   **UI rebuilt:** landing page, compare workspace (track dominance map, synced telemetry, sectors,
    lap stats), calendar, event and session pages (fastest laps, tyre strategy), share card.
-   **Verified by running:** 33 Vitest + 13 pytest tests; production build; live API checks (Monaco 2024
    Q delta +0.154 s matches official); browser journeys on desktop and mobile with no console errors.
-   **Not done:** Playwright suite in CI, formal accessibility audit, light theme, saved comparisons,
    driver profile pages, the workers.dev subdomain change (needs owner confirmation: it would also move
    the account's other Worker, `cou-hackathon`).

## Decision log

-   2026-11-16 · Real data from OpenF1 fetched at request time with layered caching, instead of
    pre-ingesting everything. Reason: a full catalogue exceeds Worker bundle limits; OpenF1 is free and
    keyless. Consequence: rate limits. Mitigated with stale-if-error caching, KV, and a cache-warming job.
-   2026-11-16 · Postgres removed from the request path (the Worker has no database). Schema and
    migrations are kept for ingestion-side storage and future saved comparisons.
-   2026-11-16 · Static assets embedded in the Worker, because the Workers Assets upload uses a JWT that
    the build environment's credential proxy overwrites. Revisit when deploying with a normal token.
-   2026-11-16 · Commercial use stays blocked until data rights are reviewed (`docs/data-rights.md`).

## Decision log template

For every significant decision, record: - Date: - Decision: - Reason: -
Alternatives considered: - Consequences: - Follow-up required:
