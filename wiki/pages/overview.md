---
type: concept
id: overview
updated: 2026-09-03
sources: [plan-md]
code: [PLAN.md, src/main.ts, src/core/engine.ts, src/ui/tree.ts, src/ui/treemodel.ts, src/ui/treegraph.ts, src/ui/treetab.ts]
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

## One tree, one tab

Since 2026-09-03 every purchase in the game lives on a single **Tree** tab — the separate
Setup and Upgrades tabs are gone. 762 nodes (300 skills + 450 shop upgrades + 12 generators)
form one graph whose edges are the requirements already present in the data:
`Skill.req`, `Upgrade.reqGen`, `reqBranch`, `reqTrack` (`src/ui/treemodel.ts`).

762 nodes do not fit on one canvas, so a rail cuts the graph into **layers**, each a
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
beyond. **794 nodes**: the 762 purchasable ones plus the centre, six folds, sixteen ranks,
seven specialisations and two taps. Ranks and taps are a node kind of their own, `anchor`:
nothing buys them, and they exist so `reqRank` stops being prose.

The hierarchy is derived, not authored — a skill's parent is `req[0]`, so a branch trunk
falls out of the data and every other prerequisite becomes an arc. Arcs bow towards the
centre, which is what makes forty cross-branch links legible instead of felt.

| family | joins | count |
|---|---|---|
| `tree` | parent → child | 793 |
| `requires` | a `Skill.req` that is not the parent | 80 |
| `career` | rank → the upgrades it gates | 202 |
| `affects` | skill → tools it multiplies, `cheaper` skills → Setup | 67 |
| `currency` | `crossCurrency.target` → the other branch — see [[faucet-antagonism]] | 40 |
| `fight` | Craft ↔ Security, from `Branch.rivals` in `src/data/branches.ts` | 2 |

`fx.gens` (96) and `fx.cur` (64) are deliberately **not** drawn: in both the effect edge
would land on the node that is already the parent. View state — mode, open folds, which
families are drawn, node density — lives in `localStorage` under `zero10x.view.v1`, kept out
of the save so `zero10x.save.v3` needs no migration.

### Density

Both layouts read one `Metrics` object (`src/ui/tree.ts`) with two presets, switched beside
the zoom buttons: **tight** (default) and **normal**. Tight roughly halves every gap —
overview 1303 → 1143 px, an opened Craft 2523 → 2219, the flat Craft layer 1124 → 1058,
nearest-neighbour gap 16 → 6 px — with zero overlapping boxes in either preset.

Two invariants the presets must not touch, both learned from a failed attempt:

- **angle stays proportional to leaves.** Sharing the circle by `leaves^0.5` shrinks the
  folded overview but narrows an opened branch's wedge, which pushes its ring outwards:
  Craft grew 2366 → 3586 px. Reverted.
- **clearance is measured on the diagonal.** Half the longer side is not enough — two boxes
  on a nearly horizontal arc meet corner-first. `reach()` and the arc rule both use
  `hypot(w, h) / 2`.

## Verified content counts

`npm run gen` prints these; they are not authored numbers.

| thing | count |
|---|---|
| skills | 300 |
| — gateways (never upgradable) | 36 |
| — upgradable | 264 |
| total purchasable levels | 2 316 |
| shop upgrades | 450 |

`PLAN.md` claimed about 2 500 levels and ~440 upgrades before 2026-09-03; both were corrected
to the printed values. See [[plan-md]].

## Branches

Eight, each with one currency and one genuinely different faucet:
[[algorithms]] · [[systems]] · [[craft]] · [[business]] · [[data]] · [[security]] ·
[[community]] · [[research]]

The sharpest design decision in the set is that [[craft]] and [[security]] draw from opposite
ends of the same tap — see [[faucet-antagonism]].

## Open questions

- Balance targets in `PLAN.md` section 6 are authored, not measured. Nothing has played a run
  and timed the first gateway at ~8 min. **Unverified.**
- `PLAN.md` section 5 listed UI modules that do not exist (`tabs.ts`, `career.ts`, `awards.ts`,
  `prestige.ts`); the real tree has `ui/shell.ts`, `ui/branches.ts`, `ui/panels.ts`.
  Corrected 2026-09-03, but it is worth knowing the spec was written ahead of the code.
- No tests exist. `npm run build` (gen + typecheck + vite) is the only gate.
