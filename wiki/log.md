# Log

Append-only, newest at the bottom. Entry prefix is fixed so
`grep "^## \[" wiki/log.md | tail -5` works.

## [2026-09-03] ingest | PLAN.md (v2 content & systems plan)
First source. Created `wiki/CLAUDE.md` schema, `pages/overview.md`, 8 branch entity pages,
3 concept pages (`currency-model`, `gateway-rule`, `faucet-antagonism`), `pages/sources/plan-md.md`,
and `tools/regen-entity-pages.mjs`. Drift policy left as an open TODO for the human.

## [2026-09-03] lint | bookkeeping gap
Schema mandates `index.md` and `log.md`; neither existed. Created both, back-filling the
2026-09-03 ingest from the pages on disk. Open findings: `wiki/raw/` empty; drift policy
undecided; four concepts referenced across pages with no page of their own (prestige loop,
rank ladder, shop upgrades, generator families).

## [2026-09-03] lint | spec drift in the skill tree, three fixes
Tier-5 unlock enforced at last: `Skill.reqLevel` + `skillUnlocked` now require four tier-4
skills at level 3, as [[gateway-rule]] already claimed. Every branch given eight distinct
effect kinds with a tier-shifted rotation and per-position power jitter, removing 138
duplicate skill descriptions (170 -> 238 unique). Two colliding gateway names renamed in
Research. `npm run gen` gained integrity checks for duplicate names, duplicate
branch+tier descriptions, gateway shape and per-branch composition. Counts unchanged:
300 / 36 / 264 / 2 316 / 450.

## [2026-09-03] ingest | the branches tab became a tree
Skills were a flat grid of cards; the `req` graph was invisible. New `src/ui/tree.ts` lays
out a canvas (row per tier, gateway trunk centred, SVG edges) and `src/ui/branches.ts` now
owns selection plus a detail panel with the buy buttons. Foundation is the map: g0, the eight
branch gateways, g1/g2/g3. Build and paint are separate so the tab's 2.5s refresh cannot eat
the zoom, scroll or selected node. Layout verified: 37 nodes / 45 edges per branch, 12 / 16
on the map, no overlaps. Content counts untouched.
