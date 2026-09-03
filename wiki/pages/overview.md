---
type: concept
id: overview
updated: 2026-09-04
sources: [plan-md]
code: [PLAN.md, src/main.ts, src/core/engine.ts, src/core/unlocks.ts, src/ui/router.ts, src/ui/nav.ts, src/ui/tree.ts, src/ui/treemodel.ts, src/ui/treegraph.ts, src/ui/treetab.ts]
---

# Zero to Ten-X — overview

An incremental career game. Empty folder and a blinking cursor at the start; near the top of
the field at the end. Vite + TypeScript, no framework, no server. Saves are `localStorage`
plus manual export/import.

`PLAN.md` is the spec and outranks the code: *"if code and this file disagree, this file is
the intent and the code is the bug."* This wiki is the third thing — it records what is
actually true right now, and flags where the two have drifted apart.

## The shape of a run

You write lines of code. Lines pay money and knowledge. Money buys generators and shop
upgrades; knowledge buys **gateways** and nothing else. Gateways open branches; branches have
their own currencies with their own faucets; those currencies buy the 264 upgradable skills.
A job hop (prestige) resets money and shop upgrades, pays reputation, and keeps perks.

See [[currency-model]] for why knowledge does only one job, and [[gateway-rule]] for why
gateways can never be upgraded.

## Pages

Since 2026-09-04 the game is a sidebar and eight pages rather than one screen with five
tabs: Desk, Tools, Skills, Career, Awards, Job Hop, Stats, and Settings behind the HUD gear.
A fresh save shows the Desk alone; the rest open at state milestones — see
[[progressive-reveal]] for the rules and why nothing about them is saved. `src/ui/router.ts`
owns the page contract (mount once, toggle `hidden`, `#/<id>` in the hash, keys `1`–`9`);
`src/ui/nav.ts` paints the sidebar and, under 860px, a four-slot bottom bar with **More**.

**Tools** is the one deliberate duplicate: the 20 generators and their 160 tier upgrades as
a flat idle list (`src/ui/pages/tools.ts`), reading the same specs and prices as the tree
through `src/ui/treemodel.ts`. Skills and shop upgrades are sold nowhere but the tree.

## One tree, one page

Since 2026-09-03 every purchase in the game lives on a single tree — first as a **Tree** tab
replacing the separate Setup and Upgrades tabs, now as the **Skills** page. 1 522 nodes
(600 skills + 902 shop upgrades + 20 generators) form one graph whose edges are the
requirements already present in the data: `Skill.req`, `Upgrade.reqGen`, `reqBranch`,
`reqTrack` (`src/ui/treemodel.ts`).

1 522 nodes do not fit on one canvas, so a rail cuts the graph into **layers**, each a
connected region of it, with a node acting as the door between two (`src/ui/treetab.ts`):

| layer | nodes | shape |
|---|---|---|
| Setup | 108 | a column per tool, its eight upgrade tiers underneath |
| Foundation | 12 | the map of all eight branches; a branch node walks into it |
| each branch ×8 | 45 | tier per row, gateway trunk, branch upgrades under the gateway |
| Upgrades | 248 (+6 with a specialisation) | a lane per money-bought family |

`src/ui/tree.ts` is now a generic renderer — layouts, edges, zoom — that knows nothing about
the game; it is handed node specs and a status function. The edges are what make
[[gateway-rule]] legible in play: a locked tier reads as a missing parent rather than a
mystery, and a tool upgrade visibly hangs off the tool it needs 25 of.

## The web

The layered view above is now the *second* mode. The default is a radial map
(`src/ui/treegraph.ts` builds it, `layoutRadial` in `src/ui/tree.ts` places it): you at the
centre, four folds around you — Setup, Upgrades, Career, Foundation — and the branches
beyond. **1 564 nodes**: the 1 522 purchasable ones plus the centre, nineteen folds (eight
hubs and one upgrade shelf per branch, `an:hub:branch:<id>`), sixteen ranks, seven
specialisations and two taps. Ranks and taps are a node kind of their own, `anchor`: nothing buys them, and
they exist so `reqRank` stops being prose.

Since 2026-09-04 the map is a **necklace of clusters** rather than one set of global rings.
Hubs, branch gateways and taps are marked `cluster` in `src/ui/treegraph.ts`; an open
cluster is laid out on its own (`place` / `fan` / `block` in `src/ui/tree.ts`) and rides as
one circle on a single ring around the centre, in tree order, with an arc back to its
parent. A hub whose children are all leaves — a money ladder, a tap, a specialisation, a
branch's upgrade shelf — is a `block`: a grid under the hub. Inside a `fan`, angle is handed
out by what a box needs where it sits (`arc`, an `asin` of footprint over radius), not in
proportion to leaves. The old scheme let one crowded ring push every other sector outwards;
a cluster cannot touch another cluster's rings.

**Every node sells itself.** `paintTree` takes a `buyLabel` and a `title` (`src/ui/tree.ts`);
`src/ui/treetab.ts` supplies them from `statusOf`, `priceLabel`, `bulkPrice`,
`affordableLevels`. The button buys `S.bulk` (the `×1 / ×10 / Max` switch, shared with the
Tools page), `B` buys the picked node, `Shift+B` buys max; anchors, maxed and locked nodes
have no button, and the tooltip carries `lockReason`. The detail panel moved into the left
column beside the map.

The hierarchy is derived, not authored — a skill's parent is `req[0]`, so a branch trunk
falls out of the data and every other prerequisite becomes an arc. Arcs bow towards the
centre, which is what makes forty cross-branch links legible instead of felt.

| family | joins | count |
|---|---|---|
| `tree` | parent → child | 801 |
| `requires` | a `Skill.req` that is not the parent | 80 |
| `career` | rank → the upgrades it gates | 202 |
| `affects` | skill → tools it multiplies, `cheaper` skills → Setup | 67 |
| `currency` | `crossCurrency.target` → the other branch — see [[faucet-antagonism]] | 40 |
| `fight` | Craft ↔ Security, from `Branch.rivals` in `src/data/branches.ts` | 2 |

`fx.gens` (96) and `fx.cur` (64) are deliberately **not** drawn: in both the effect edge
would land on the node that is already the parent. View state — mode, open folds, which
families are drawn, node density, plus the last page and which pages have been visited —
lives in `localStorage` under `zero10x.view.v1` (`src/ui/viewstore.ts`), kept out of the
save so `zero10x.save.v3` needs no migration.

### Density and size

Both layouts read one `Metrics` object (`src/ui/tree.ts`) with two presets, switched beside
the zoom buttons: **tight** (default) and **normal**. Measured 2026-09-04 with the necklace
layout, 124×52 boxes, headless Chromium at 1440×900 (scratch `measure.cjs`, five shapes,
both presets, zero overlapping boxes in all ten):

| shape (nodes) | tight | normal | before (tight, 2026-09-03) |
|---|---|---|---|
| fresh save (16) | 1 555 px | 1 779 | 1 143 |
| Craft gateway open (26) | 1 470 | 1 680 | 2 219 |
| Craft + Systems open (36) | 1 600 | 1 766 | ≈ 3 000 |
| Upgrades + Output ladder open (93) | 2 847 | 3 372 | (unmeasured) |
| Setup open (28) | 1 647 | 1 877 | — |

Nearest-neighbour gap 6–19 px tight, 12–28 normal. Fit is floored at 60% (`WEB_FIT_MIN`),
so the smallest on-screen box is 74 px wide and a name stays a name; the fresh save is the
one shape that grew, because Foundation is now a real circle of eleven gateways instead of
a ring shared with the hubs.

Two invariants the presets must not touch:

- **clearance is measured on the diagonal.** Half the longer side is not enough — two
  axis-aligned boxes on a nearly horizontal arc meet corner-first. Footprints and ring gaps
  use `hypot(w, h) / 2`.
- **circles do not nest.** Laying an open cluster out inside its parent's circle was tried
  first on 2026-09-04: every level doubled the map (Craft open: 3 051 px). One necklace,
  tree order, arcs to parents — that is the whole trick.

## Verified content counts

`npm run gen` prints these; they are not authored numbers.

| thing | count |
|---|---|
| skills | 600 |
| — gateways (never upgradable) | 64 |
| — upgradable | 536 |
| total purchasable levels | 4 120 |
| shop upgrades | 902 |
| tools | 20 |
| awards | 94 |
| nodes on the map | 1 564 |

`PLAN.md` claimed about 2 500 levels and ~440 upgrades before 2026-09-03; both were corrected
to the printed values. The catalogue roughly doubled on 2026-09-04 — tiers 6 and 7 per
branch, three more sub-paths, eight more tools, a third rung on every money ladder, and two
new ladders (offline, luck). See [[plan-md]] and [[progressive-reveal]].

## Branches

Eight, each with one currency and one genuinely different faucet:
[[algorithms]] · [[systems]] · [[craft]] · [[business]] · [[data]] · [[security]] ·
[[community]] · [[research]]

The sharpest design decision in the set is that [[craft]] and [[security]] draw from opposite
ends of the same tap — see [[faucet-antagonism]].

## Open questions

- Balance targets in `PLAN.md` section 6 are authored, not measured. Nothing has played a run
  and timed the first gateway at ~8 min. **Unverified.**
- `PLAN.md` section 5 listed UI modules that did not exist (`tabs.ts`, `career.ts`, `awards.ts`,
  `prestige.ts`); corrected 2026-09-03 to the tree on disk. On 2026-09-04 the pages refactor
  created `ui/pages/career.ts` and `ui/pages/awards.ts` for real and deleted `ui/panels.ts`,
  so the spec was right about the shape and wrong about the timing.
- The page thresholds in `src/core/unlocks.ts` are authored defaults, never play-tested — see
  [[progressive-reveal]].
- No tests exist. `npm run build` (gen + typecheck + vite) is the only gate.
