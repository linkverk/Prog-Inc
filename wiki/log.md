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

## [2026-09-03] ingest | Setup and Upgrades folded into one Tree tab
Three tabs bought things three different ways and the links between them were invisible.
Now one **Tree** tab holds all 762 nodes — 300 skills, 450 upgrades, 12 generators — as one
graph, cut into layers by a rail: Setup (108), Foundation (12), each branch (45), Upgrades
(248, 254 with a specialisation). `src/ui/tree.ts` was stripped of every game import and is
now a generic renderer taking node specs plus a status function; `src/ui/treemodel.ts` holds
what a node *is* (layers, specs, live status, buy dispatch) and `src/ui/treetab.ts` the tab
itself. `setup.ts` and `shop.ts` deleted, `branches.ts` became `treetab.ts`. Search now spans
every layer, with the old shop filters as a highlight lens. Verified headless over CDP: node
and edge counts per layer, the layer doors, ×1/×10/Max on tools, a gateway purchase, and
zoom / scroll / selection surviving the 2.5s repaint. Content counts untouched: 300 / 450.

## [2026-09-03] ingest | the tree became a web
Half the game's connections existed only as prose — `reqRank` on 202 upgrades, `reqTrack` on
42, `crossCurrency.target` on 40 skills, `gens[]` on 10 — because a layer could only draw
edges inside itself. The tab now defaults to a radial map of all **794 nodes** built by the
new `src/ui/treegraph.ts`: you at the centre, folds for Setup / Upgrades / Career /
Foundation, the branches beyond, and a new `anchor` node kind for ranks, specialisations and
the two taps. The hierarchy is derived from `req[0]`, so nothing is authored twice; every
other link becomes an arc bowed towards the centre, in five switchable families (requires 80,
career 202, affects 67, currency 40, fight 2). `Branch.rivals` was added to
`src/data/branches.ts` so the Craft/Security antagonism ([[faucet-antagonism]]) is data, not
a UI special case. The layered view survives behind a Web/Layers switch. Two bugs found and
fixed by the headless pass: the layer cache was clearing the shared spec registry (anchors
vanished from `specById`), and ring radii ignored the neighbouring rings' node boxes (eight
overlapping pairs at the centre — now zero). Content counts untouched: 300 / 450.

## [2026-09-03] lint | node spacing halved, Tight/Roomy switch
Nodes sat too far apart: 12×40 px in the grid, rings 60 px plus their neighbours' boxes, so
even the sixteen-node overview stretched to 1249 px and fitted at 40%. The layout constants
became a `Metrics` object with two presets (`tight` default, `normal`), switchable beside the
zoom buttons and remembered in `zero10x.view.v1`. Overview 1303 → 1143 px, an opened Craft
2523 → 2219, the flat Craft layer 1124 → 1058, smallest neighbour gap 16 → 6 px, still zero
overlaps. Two things the measurements caught and the eye would not: sharing the circle by
`leaves^0.5` shrinks the folded overview but *grows* an opened branch (2366 → 3586 px), so it
was reverted; and the anti-overlap radius was using half the longer side, which lets two
boxes meet corner-first on a nearly horizontal arc — it now uses half the diagonal. Also
`layerLayout` memoised its layouts, so the flat view ignored the new spacing until the cache
was cleared. Content counts untouched.

## [2026-09-04] ingest | one page became eight

The game moved from one screen with five tabs to a sidebar and eight pages (desk, tools,
skills, career, awards, hop, stats, settings) with progressive reveal driven by
`src/core/unlocks.ts`. New concept page [[progressive-reveal]] carries the unlock table.
[[overview]] gained a Pages section, "One tree, one tab" became "One tree, one page", the
view-state note now covers `page` and `seen[]`, and the section-5 open question records that
`ui/pages/career.ts` and `ui/pages/awards.ts` now exist and `ui/panels.ts` is gone. Tools is
documented as the one deliberate second view of the 12 generators. Content counts untouched.
