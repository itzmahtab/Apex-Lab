# ApexLab F1 --- Application Flow

## 1. Primary flow: compare two laps

``` mermaid
flowchart TD
    A[Home page] --> B[Open Compare]
    B --> C[Choose season]
    C --> D[Choose event]
    D --> E[Choose session]
    E --> F[Choose Driver A and lap]
    F --> G[Choose Driver B and lap]
    G --> H{Valid selection?}
    H -- No --> I[Show validation or missing-data message]
    I --> F
    H -- Yes --> J[Load comparison data]
    J --> K{Artifact available?}
    K -- No --> L[Offer demo mode or explain data unavailable]
    K -- Yes --> M[Render summary and charts]
    M --> N[Create stable comparison URL]
    N --> O[Copy link or generate share card]
```

## 2. Home page flow

1.  Show a clear value proposition: compare laps and understand the
    difference.
2.  Provide a primary CTA: "Compare laps".
3.  Show a small demo comparison clearly labelled as demo data if it is
    synthetic.
4.  Explain the three core benefits: lap delta, telemetry explorer,
    shareable result.
5.  Provide links to About, Data & methodology, Privacy, Terms, and
    Contact.

## 3. Compare page states

### Initial

No selection has been made. Show selectors and concise instructions.

### Loading

Keep selectors visible; show skeletons in chart areas. Avoid layout
shifts.

### Success

Show: - Selected event and session. - Driver and lap labels. - Lap times
and delta. - Sector comparison where available. - Speed vs distance
chart. - Throttle/brake chart when available. - Methodology note and
data source note. - Share URL and card actions.

### Partial data

Render available fields and explain which signals are missing. Do not
invent values.

### Empty data

Explain that no approved artifact is available for the selection. Offer
a demo comparison.

### Error

Show a friendly error, retry action, and a non-technical message. Log
the underlying error on the server without leaking secrets.

## 4. Share flow

1.  User completes a comparison.
2.  App serializes stable IDs---not display labels---into a URL or
    creates a database-backed slug.
3.  App validates the selection on page load.
4.  The comparison page reconstructs the same selection.
5.  Social preview metadata uses a generated image or safe fallback.
6.  User copies the link or downloads the card.
7.  Shared page always includes a route back to the interactive
    comparison.

Do not put large telemetry arrays in the URL. URLs should contain
identifiers and small options only.

## 5. Data ingestion flow

1.  Operator runs the CLI with a supported session identifier.
2.  Job checks whether the artifact is already current.
3.  Job loads cached source data or fetches data from the configured,
    permitted adapter.
4.  Job normalizes records.
5.  Validation reports missing fields, invalid laps, and unsupported
    signals.
6.  Calculation functions produce comparison-ready data.
7.  Artifact is written atomically to avoid partially written files.
8.  Metadata and processing status are updated.
9.  The job exits with a meaningful status code.

## 6. Error flows

-   Unknown season/event/session: return a not-found response.
-   Driver not present in session: return a validation error.
-   Lap not present: return a validation error.
-   No telemetry signal: render the available summary and omit the
    unavailable chart.
-   Database unavailable: show a safe error state; local fixture mode
    can be used during development.
-   Ingestion failure: preserve the last known good artifact and mark
    the new job as failed.
-   Unsupported artifact version: return a controlled compatibility
    error and reprocess the artifact.

## 7. Future flows (not MVP blockers)

-   Favorite a driver.
-   Save a comparison to an account.
-   Join a prediction league.
-   Generate a season recap.
-   Receive race-weekend email alerts.

Build these only after the anonymous compare-and-share journey works
end-to-end.
