# Data rights

**Status:** ApexLab shows real timing and telemetry from **OpenF1** as a **non-commercial, unofficial fan project**. Commercial use (ads, paid features, sponsorship) stays **blocked** until the checklist below is done.

## Sources

| Source | What | Used for | Notes |
|---|---|---|---|
| [OpenF1](https://openf1.org) | Sessions, drivers, laps, stints, car data, positions (2023+) | Everything on the live site | Free, open-source, unofficial. Republishes F1 live-timing data. Attributed in the footer, methodology page, every comparison and every share card. |
| Synthetic demo fixtures | Fictional circuit, season 2099, fictional drivers | Offline mode and tests | Invented values, always labelled "Demo data". |
| FastF1 | — | Not used | The F1 live-timing endpoint it reads returned 401 from the build environment; the adapter is a gated stub (`APEXLAB_ENABLE_FASTF1=1`). |

## What the project does and doesn't do

- **Does:** read data on demand, cache it (30 days for completed sessions), and show derived analysis with attribution.
- **Does not:** use official F1 logos, team logos, driver photos (OpenF1 headshot URLs are deliberately ignored), broadcast footage, or imitation F1 typography.
- **Does not:** commit real F1 data to the repository. Python tests use OpenF1-shaped synthetic payloads, and real snapshots go to the git-ignored `data/artifacts/`.
- **Does not:** imply affiliation. The disclaimer is on every page and every share card.

A disclaimer is not permission. Formula 1 timing data belongs to its rights holders. An open-source library or community API does not grant rights to the underlying data.

## Before any commercial use

- [ ] Review Formula One Management's terms for timing data and seek permission where needed.
- [ ] Review OpenF1's current terms and its paid tier, if any, for commercial use.
- [ ] Decide whether cached derived data may be stored and served at scale.
- [ ] Have the privacy and terms pages reviewed.
- [ ] Only then consider ads, sponsorship or paid features.
