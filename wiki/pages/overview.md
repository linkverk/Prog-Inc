---
type: concept
id: overview
updated: 2026-09-03
sources: [plan-md]
code: [PLAN.md, src/main.ts, src/core/engine.ts]
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

The branches tab draws this as an actual tree (`src/ui/tree.ts`): a row per tier, the
gateway trunk down the middle, one edge per prerequisite, and Foundation as the map of all
eight branches. The edges are what make [[gateway-rule]] legible in play — a locked tier
reads as a missing parent rather than a mystery.

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
