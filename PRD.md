# ApexLab F1 --- Product Requirements Document

**Product:** ApexLab F1\
**Tagline:** The science behind the speed.\
**Document status:** Build specification\
**Initial release:** Local, workable MVP\
**Framework requirement:** Next.js 16+ with TypeScript\
**Primary goal:** Build a useful F1 analytics fan site with shareable
comparisons and future monetization potential.

## 1. Product vision

ApexLab is an independent motorsport analytics experience that helps
fans explore driver performance, compare laps, understand where time is
gained or lost, and share clear visual discoveries.

The product should make data approachable without hiding the engineering
underneath it. A fan should be able to choose an event, session, two
drivers, and laps, then see a meaningful comparison and share a stable
link.

## 2. Product goals

1.  Deliver a working local full-stack application before deployment
    work begins.
2.  Provide an interactive driver/lap comparison workflow.
3.  Make telemetry and timing understandable through charts, units, and
    short explanations.
4.  Support shareable comparison URLs and social preview metadata.
5.  Keep the initial stack free to develop and self-host where
    practical.
6.  Keep data ingestion separate from web requests.
7.  Design the product so rights-cleared data can be substituted without
    rewriting the application.

## 3. Non-goals for the first workable version

-   Live timing or live race control.
-   Betting, gambling, paid predictions, or cash prizes.
-   User accounts, social feeds, comments, or private leagues.
-   AI-generated articles.
-   A full race simulator.
-   Native mobile apps.
-   Production deployment, formal load testing, or AdSense application
    during the initial build.
-   Scraping websites in ways that violate their terms.
-   Republishing protected data, photographs, logos, or broadcast
    material without appropriate permission.

## 4. Target users

### Primary: Curious F1 fan

Wants to compare two drivers and understand a lap without needing
specialist software.

### Secondary: Data-minded fan or engineering student

Wants speed, throttle, brake, distance, sector, and lap-time charts.

### Tertiary: F1 community creator

Wants a clear, attractive, linkable insight to share with an audience.

## 5. Core user stories

-   As a fan, I can select a season, event, session, two drivers, and
    two laps.
-   As a fan, I can compare lap time and sector times.
-   As a fan, I can inspect speed and throttle/brake traces against
    distance.
-   As a fan, I can understand the units and limitations of the data.
-   As a fan, I can copy a URL that restores the selected comparison.
-   As a fan, I can create or download a comparison card.
-   As a visitor, I can open a public analysis page without signing in.
-   As a developer, I can run the app locally with documented
    environment variables.
-   As a developer, I can load clearly labelled demo fixtures if FastF1
    data is unavailable.
-   As an operator, I can rerun ingestion without creating duplicate
    records.

## 6. MVP scope

### Must have

-   Next.js 16+ App Router and TypeScript.
-   Responsive public landing page.
-   Season/event/session selection.
-   Driver and lap selection.
-   Comparison summary with lap-time delta and sector values where
    available.
-   Interactive telemetry charts with synchronized distance axis.
-   Data availability, loading, empty, and error states.
-   Stable shareable comparison URL.
-   Share-card generation or a clear downloadable card path.
-   Seed/demo dataset for reliable local development.
-   Python FastF1 ingestion script kept separate from the web runtime.
-   PostgreSQL schema and migrations.
-   Basic unit tests for calculations and validation.
-   README with setup instructions.

### Should have after core flow works

-   Driver profile pages.
-   Event/session archive pages.
-   Static editorial explainers using original writing.
-   Favorites stored locally in the browser.
-   OG image metadata for comparisons.
-   Cached data artifacts and ingestion status.

### Later

-   Authentication and cloud-synced favorites.
-   Prediction leagues.
-   Advanced race strategy analysis.
-   AI-assisted editorial summaries with human review.
-   Premium reports, sponsorships, and ads after rights and policy
    review.

## 7. Main success criteria for the workable MVP

-   A developer can start the web app using documented commands.
-   The app works without requiring a paid API key.
-   The comparison screen works using seeded demo data.
-   A supported FastF1 ingestion run can produce a validated artifact
    when permitted data is available.
-   Two different selected laps produce correct and explainable
    comparison results.
-   A shared URL reconstructs the same selection.
-   The app never presents demo values as real race results.
-   Missing telemetry does not crash the page.
-   The core workflow is usable on a mobile-width screen.

## 8. Product experience

1.  User opens the home page.
2.  User chooses "Compare laps."
3.  User selects event/session.
4.  User selects Driver A and Driver B.
5.  User selects a lap for each driver.
6.  App shows lap times, delta, sector comparison, and telemetry charts.
7.  App explains the result using a concise, deterministic summary.
8.  User copies the URL or generates a share card.

## 9. Data and rights policy

FastF1 is a software library; its license does not automatically grant
commercial rights to data retrieved through it. Before public release or
monetization, review the relevant source terms and rights-holder
guidelines. Use synthetic/demo fixtures for UI work where needed. Do not
bundle official logos, race photography, broadcast footage, or other
protected assets without permission. Clearly identify the project as
unofficial and do not imply affiliation.

Every imported dataset must have a source, retrieval timestamp,
license/permission status, attribution requirements, and permitted-use
notes recorded in documentation or metadata. If commercial rights cannot
be confirmed, do not publish the affected material commercially.

## 10. Monetization principles

Monetization is not part of the initial local build. Later options may
include AdSense, carefully selected affiliate links, sponsorships, or
paid analytics features. Do not apply for ads until the site has useful
original content, policy-compliant pages, adequate user experience, and
the necessary rights for its content. Revenue is not guaranteed.

## 11. Risks and mitigations

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  Data source unavailable             Seed fixtures and adapter boundary

  Telemetry missing or inconsistent   Validate fields and show graceful
                                      empty states

  Data rights unclear                 Keep public/commercial release
                                      gated

  Free-tier limits change             Keep providers replaceable and
                                      avoid always-on workers

  Too much scope                      Finish the single comparison
                                      workflow first

  SEO pages become thin duplicates    Publish only useful, unique
                                      analysis pages

  Incorrect comparison                Unit tests, unit metadata, validity
                                      filtering
  -----------------------------------------------------------------------

## 12. Definition of "workable"

For this project, "workable" means the local application can be started,
navigated, and used end-to-end with demo data; the data model and Python
processing boundary exist; core calculations are validated with
fixtures; and no deployment is required to demonstrate the product.
Deployment, production testing, analytics tuning, and monetization
approval are later stages.
