# ApexLab F1 --- Database and Artifact Schema

## 1. Schema principles

-   PostgreSQL stores relational metadata.
-   Telemetry arrays are stored as versioned JSON artifacts or object
    files.
-   The local MVP must support a fixture mode.
-   All lap and sector times are integer milliseconds.
-   All timestamps are stored as UTC.
-   Missing values are null/absent, never fabricated zeroes.
-   Only create tables needed by the MVP; future tables are documented
    but optional.

## 2. Entity relationship diagram

``` mermaid
erDiagram
    SEASONS ||--o{ EVENTS : contains
    EVENTS ||--o{ SESSIONS : contains
    SESSIONS ||--o{ LAPS : records
    DRIVERS ||--o{ LAPS : drives
    SESSIONS ||--o{ TELEMETRY_ARTIFACTS : produces
    DRIVERS ||--o{ TELEMETRY_ARTIFACTS : has
    SESSIONS ||--o{ COMPARISONS : compared_in
    DRIVERS ||--o{ COMPARISONS : driver_a
    DRIVERS ||--o{ COMPARISONS : driver_b
    COMPARISONS ||--o{ SHARE_ASSETS : generates
    SESSIONS ||--o{ PROCESSING_JOBS : processes
```

## 3. Tables

### seasons

-   `id`: UUID primary key.
-   `year`: integer, unique.
-   `status`: text/enum, e.g. upcoming, active, completed.
-   `created_at`: timestamptz.

### events

-   `id`: UUID primary key.
-   `season_id`: UUID foreign key to seasons.
-   `external_key`: text, stable source identifier.
-   `name`: text.
-   `circuit_name`: nullable text.
-   `country_code`: nullable text.
-   `start_at`: nullable timestamptz.
-   `status`: text.
-   Unique: `(season_id, external_key)`.

### sessions

-   `id`: UUID primary key.
-   `event_id`: UUID foreign key to events.
-   `external_key`: text.
-   `session_type`: text, e.g. practice, qualifying, sprint, race.
-   `started_at`: nullable timestamptz.
-   `status`: text, e.g. scheduled, available, processing, processed,
    failed.
-   `processed_at`: nullable timestamptz.
-   `artifact_version`: nullable integer.
-   Unique: `(event_id, external_key)`.

### drivers

-   `id`: UUID primary key.
-   `external_key`: text, stable source identifier.
-   `abbreviation`: text.
-   `display_name`: text.
-   `nationality`: nullable text.
-   `created_at`: timestamptz.
-   Unique: `external_key`.

### laps

-   `id`: UUID primary key.
-   `session_id`: UUID foreign key.
-   `driver_id`: UUID foreign key.
-   `lap_number`: integer, positive.
-   `lap_time_ms`: nullable integer.
-   `sector_1_ms`, `sector_2_ms`, `sector_3_ms`: nullable integers.
-   `compound`: nullable text.
-   `tyre_life`: nullable numeric.
-   `is_valid`: nullable boolean.
-   `source_status`: nullable text.
-   Unique: `(session_id, driver_id, lap_number)`.

### telemetry_artifacts

-   `id`: UUID primary key.
-   `session_id`: UUID foreign key.
-   `driver_id`: UUID foreign key.
-   `lap_number`: integer.
-   `artifact_uri`: text or relative local artifact key.
-   `format_version`: integer.
-   `calculation_version`: text.
-   `source_key`: text.
-   `processed_at`: timestamptz.
-   `metadata_json`: JSONB.
-   Unique:
    `(session_id, driver_id, lap_number, format_version, calculation_version)`.

### comparisons

-   `id`: UUID primary key.
-   `slug`: text, unique.
-   `session_id`: UUID foreign key.
-   `driver_a_id`, `driver_b_id`: UUID foreign keys to drivers.
-   `lap_a`, `lap_b`: integer.
-   `summary_json`: JSONB.
-   `visibility`: text, default public.
-   `created_at`: timestamptz.
-   Check: `driver_a_id <> driver_b_id`.

### share_assets

-   `id`: UUID primary key.
-   `comparison_id`: UUID foreign key.
-   `asset_uri`: text.
-   `asset_type`: text.
-   `generated_at`: timestamptz.
-   `expires_at`: nullable timestamptz.

### processing_jobs

-   `id`: UUID primary key.
-   `session_id`: UUID foreign key.
-   `status`: text.
-   `attempts`: integer, default 0.
-   `started_at`, `finished_at`: nullable timestamptz.
-   `error_code`: nullable text.
-   `log_summary`: nullable text.
-   `input_hash`: nullable text.

## 4. Indexes

-   `events(season_id, start_at)`
-   `sessions(event_id, session_type)`
-   `laps(session_id, driver_id, lap_number)`
-   `telemetry_artifacts(session_id, driver_id, lap_number)`
-   `comparisons(slug)`
-   `processing_jobs(session_id, status)`

## 5. Telemetry artifact contract

Example shape; values are illustrative only:

``` json
{
  "schemaVersion": 1,
  "source": {
    "name": "demo-fixture",
    "retrievedAt": "2026-01-01T00:00:00Z",
    "rightsStatus": "synthetic-demo"
  },
  "session": {
    "season": 2026,
    "eventKey": "demo-event",
    "sessionKey": "demo-session"
  },
  "driver": {
    "key": "driver-a",
    "abbreviation": "DRA"
  },
  "lap": {
    "number": 12,
    "lapTimeMs": 90400,
    "isValid": true
  },
  "units": {
    "distance": "m",
    "speed": "km/h",
    "throttle": "percent",
    "brake": "boolean-or-percent",
    "time": "seconds-from-lap-start"
  },
  "samples": [
    {
      "distanceM": 0,
      "timeS": 0,
      "speedKph": 120,
      "throttlePct": 70,
      "brakePct": 0,
      "gear": 3
    }
  ]
}
```

The sample is synthetic and must not be mistaken for an actual F1 lap.
Ensure the real adapter normalizes each signal to the documented units,
and document whether `brake` is boolean or percentage for a given
source. Do not mix the two representations in one artifact without an
explicit signal type.

## 6. Comparison calculation contract

Input: - Session identifier. - Driver A, lap A. - Driver B, lap B. -
Validated telemetry artifact references.

Output: - Driver and lap metadata. - Lap times in milliseconds. -
`lapDeltaMs = lapBMs - lapAMs`. - Sector deltas, only where both values
exist. - Distance-aligned chart samples. - `calculationVersion`. -
Missing-signal list. - Methodology notes.

Interpretation: - Positive lap delta: B took longer than A. - Negative
lap delta: B was faster than A. - Do not compare laps from different
sessions unless the UI explicitly supports and explains that mode.

## 7. Future-only tables

Do not implement these until the relevant feature is approved: -
`users` - `favorites` - `prediction_leagues` - `predictions` -
`comments` - `subscriptions`

This keeps the initial schema focused and reduces security and migration
work.
