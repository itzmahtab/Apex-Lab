# Data rights

**Status:** ApexLab shows real timing and telemetry from **OpenF1** as a **non-commercial, unofficial fan project**. Commercial use (ads, paid features, sponsorship) stays **blocked** until the checklist below is done.

## Sources

| Source | What | Used for | Notes |
|---|---|---|---|
| [OpenF1](https://openf1.org) | Sessions, drivers, laps, stints, car data, positions (2023+) | Everything on the live site | Free, open-source, unofficial. Republishes F1 live-timing data. Attributed in the footer, methodology page, every comparison and every share card. |
| [Jolpica](https://github.com/jolpica/jolpica-f1) | Calendar, race / sprint / qualifying classifications, standings | Season hub and GP pages | Community successor to Ergast. Rate limits respected (requests spaced, cached). |
| [f1-livetiming-api](https://github.com/julesr0y/f1-livetiming-api) (hosted on Render) | Live timing tower, sectors, tyres, race control, weather | `/live` | Relays F1's public live-timing feed. |
| Formula 1 media CDN (`media.formula1.com`) | Official car renders and driver portraits | Showroom, driver cards, podiums | **Owner's decision** (see below). Hot-linked, never copied into the repository. © Formula 1 and the teams. |
| Synthetic demo fixtures | Fictional circuit, season 2099, fictional drivers | Offline mode and tests | Invented values, always labelled "Demo data". |
| FastF1 | — | Not used | The F1 live-timing endpoint it reads returned 401 from the build environment; the adapter is a gated stub (`APEXLAB_ENABLE_FASTF1=1`). |

## What the project does and doesn't do

- **Does:** read data on demand, cache it (30 days for completed sessions), and show derived analysis with attribution.
- **Does:** show official car renders and driver portraits, loaded directly from Formula 1's image CDN. This was an explicit decision by the project owner, who accepts the risk; the images are not stored in the repo, and each car photo carries a "© Formula 1 / team" credit. Remove `lib/f1-media.ts` usage to go back to the original artwork (the procedural 3D car and number cards remain in place).
- **Does not:** use official F1 or team logos as branding, broadcast footage, the F1 theme music (the site's soundtrack is original and synthesised in the browser), or imitation F1 typography.
- **Does not:** commit real F1 data to the repository. Python tests use OpenF1-shaped synthetic payloads, and real snapshots go to the git-ignored `data/artifacts/`.
- **Does not:** imply affiliation. The disclaimer is on every page and every share card.

A disclaimer is not permission. Formula 1 timing data belongs to its rights holders. An open-source library or community API does not grant rights to the underlying data.

## Before any commercial use

- [ ] Review Formula One Management's terms for timing data and seek permission where needed.
- [ ] Review OpenF1's current terms and its paid tier, if any, for commercial use.
- [ ] Decide whether cached derived data may be stored and served at scale.
- [ ] Have the privacy and terms pages reviewed.
- [ ] Replace or license the official car and driver imagery.
- [ ] Only then consider ads, sponsorship or paid features.
