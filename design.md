# ApexLab F1 --- Design System

## 1. Design direction

ApexLab should feel like a motorsport engineering instrument---not a
generic admin dashboard. Use a graphite canvas, high-contrast data,
carefully chosen racing-red accents, cool telemetry colors, and
restrained motion.

The interface should balance two audiences: - Fans who want a clear
answer quickly. - Data-minded users who want to inspect the underlying
signals.

## 2. Brand

-   Name: ApexLab
-   Descriptor: Independent F1 analytics
-   Tagline: The science behind the speed.
-   Personality: precise, energetic, curious, trustworthy.
-   Avoid official F1 branding, logos, typography imitations, or claims
    of affiliation.

## 3. Color tokens

Suggested dark theme: - Background: `#0B0D10` - Surface: `#141820` -
Elevated surface: `#1B2029` - Border: `#2A303A` - Main text: `#F4F6F8` -
Muted text: `#A7B0BC` - Racing accent: `#FF453A` - Telemetry blue:
`#56B4E9` - Throttle green: `#67D5A5` - Warning amber: `#F6C453`

Use color tokens through CSS variables and Tailwind theme configuration.
Never communicate driver identity or chart meaning through color alone.

## 4. Typography

-   Headings: a modern sans-serif such as Geist Sans.
-   Body: Geist Sans or a system sans-serif.
-   Data labels: tabular numerals enabled where possible.
-   Use concise labels and keep chart annotations readable at mobile
    widths.
-   Avoid using italic or all-caps for long paragraphs.

## 5. Layout

### Desktop

-   Top navigation with logo, Compare, Drivers, Events, About.
-   Main content max width around 1280px.
-   Comparison controls in a compact top panel or side panel.
-   Charts use the remaining width.
-   Summary cards show lap time, delta, and sector results.
-   Methodology and data source notes remain accessible beneath charts.

### Mobile

-   Stack selectors vertically.
-   Use full-width chart cards.
-   Keep the main comparison summary near the top.
-   Make chart tooltips usable with touch.
-   Put share actions where they can be reached without obscuring data.
-   Avoid horizontal page scrolling; chart internals may have controlled
    responsive behavior.

## 6. Core components

-   `AppHeader`
-   `PageContainer`
-   `SeasonSelect`
-   `EventSelect`
-   `SessionSelect`
-   `DriverSelect`
-   `LapSelect`
-   `ComparisonSummary`
-   `LapDeltaBadge`
-   `SectorDeltaTable`
-   `TelemetryChartCard`
-   `ChartLegend`
-   `DataStatusNotice`
-   `MethodologyDisclosure`
-   `ShareCardPreview`
-   `CopyLinkButton`
-   `EmptyState`
-   `ErrorState`
-   `SkeletonCard`

Build reusable components only when reuse is real. Avoid a giant generic
component with many unrelated modes.

## 7. Motion and animation

Use Motion for React and shadcn/ui primitives, with motion as
progressive enhancement.

Suggested animations: - Selector changes: subtle 120--180ms
fade/slide. - Chart appearance: short opacity transition. - Summary
delta: number changes only after data is loaded. - Share-card preview:
gentle entrance. - Skeleton shimmer: restrained and disabled when
reduced motion is preferred.

Rules: - Respect `prefers-reduced-motion`. - Do not animate every chart
point. - Do not delay interactions for dramatic transitions. - Keep
animation purposeful and performant. - Use CSS transitions for simple
hover/focus states.

## 8. Charts

-   Speed vs distance: two lines with shared distance axis.
-   Throttle vs distance: percentage scale from 0 to 100.
-   Brake signal: clearly identify whether it is boolean or percentage.
-   Lap delta: use an explicit sign and units.
-   Sector table: show times and delta values.
-   Use tooltips with units and driver/lap identity.
-   Handle gaps and missing signals without drawing false continuous
    lines.
-   Include textual summaries for accessibility.
-   Do not display synthetic values without a "Demo data" label.

## 9. Home page wireframe

1.  Header and navigation.
2.  Hero: "Find where the lap was won."
3.  Primary CTA: Compare laps.
4.  Compact interactive/demo comparison, explicitly labelled if
    synthetic.
5.  Three feature cards: Compare, Explore, Share.
6.  Selected original analyses or circuit explainers.
7.  Methodology/data transparency section.
8.  Footer with About, Contact, Privacy, Terms, and unofficial-project
    notice.

## 10. Comparison page wireframe

1.  Breadcrumb: Season → Event → Session.
2.  Heading and data status.
3.  Driver/lap selection controls.
4.  Lap times and overall delta.
5.  Sector delta row/table.
6.  Speed telemetry chart.
7.  Throttle and brake charts.
8.  Short, deterministic takeaway.
9.  Share card preview and copy-link action.
10. Methodology, source, units, and limitations.

## 11. Accessibility

-   Meet WCAG AA contrast where practical.
-   Keyboard-accessible selectors and share actions.
-   Visible focus ring.
-   Semantic heading order.
-   Accessible labels for chart controls.
-   Text alternatives for key chart findings.
-   Reduced-motion support.
-   Never rely on red/green alone to show better/worse.

## 12. Ads and editorial layout

Do not place ads in the initial local build. If ads are introduced
later: - Keep them visually separate from controls and data. - Never
disguise ads as telemetry cards. - Avoid layouts that cause accidental
clicks. - Preserve chart readability and page performance. - Review
applicable advertising policies before enabling ads.
