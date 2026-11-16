# Data rights checklist (Phase 1 gate)

**Status: real data NOT cleared. The app ships synthetic demo data only.**

## Policy
- Demo fixtures are synthetic: fictional circuit, season 2099, fictional drivers (`Demo Driver A/B`). Source `demo-fixture`, `rightsStatus: synthetic-demo`. The UI shows a "Demo data" notice wherever they appear.
- Never present invented values as real results. Never add real driver names/laps to fixtures.
- FastF1 is a library; its licence does not grant rights to the data it fetches. The adapter is disabled unless `APEXLAB_ENABLE_FASTF1=1`.
- No official F1 logos, photos, broadcast material or imitation typography. Site and share cards state they are unofficial.

## Before enabling real data publicly / commercially
- [ ] Review the terms of the underlying timing/telemetry source and rights-holder guidelines.
- [ ] Record per dataset: source, retrieval timestamp, licence/permission, attribution, permitted use (artifact `source` block).
- [ ] Decide whether derived artifacts may be redistributed.
- [ ] Publish real Privacy and Terms pages.
- [ ] Do not enable ads until the above and policy review are done.

## Open questions
1. Which source/licence will back a public beta?
2. May derived telemetry artifacts be cached in public object storage?
3. Attribution wording required by the source?
