# ApexLab F1 --- Project Memory

This file is the handoff note for future ChatGPT sessions or
collaborators. Update it after each meaningful implementation phase.

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

-   Initial specification created.
-   Phases 1-10 implemented locally (see `README.md`, `docs/architecture-notes.md`).
-   Verified by running: Vitest (analytics, contracts), pytest (ingestion), `next build`,
    API error cases via curl, Playwright smoke on desktop and 390px mobile (no console errors,
    no horizontal overflow, selector -> URL -> reload restores selection), Postgres migration + idempotent seed.
-   NOT done: phases 11-14 (formal testing/Playwright suite, deployment, monetization), keyboard/reduced-motion audit,
    real FastF1 normalization (adapter is a gated stub), light theme, saved `comparisons` rows, driver pages.
-   Next action: review, then Phase 11 (dedicated testing) or real-data rights decision.

## Decision log template

For every significant decision, record: - Date: - Decision: - Reason: -
Alternatives considered: - Consequences: - Follow-up required:
