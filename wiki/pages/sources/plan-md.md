---
type: source
id: plan-md
updated: 2026-09-03
sources: []
code: [PLAN.md]
---

# Source — PLAN.md (v2 content & systems plan)

**What it is.** The authored spec for Zero to Ten-X v2. Written by the human, ingested
2026-09-03 as the wiki's first source. Not a raw file under `wiki/raw/` — it lives at the
repo root and it changes, so it is a living source, not an immutable one.

**Its own claim to authority**: *"If code and this file disagree, this file is the intent and
the code is the bug."* That makes it the top of the intent hierarchy and puts every drift
question in the wiki's lap — see the TODO drift policy in `wiki/CLAUDE.md`.

## Key claims

| claim | status |
|---|---|
| 300 skills, 36 gateways, 264 upgradable | **verified** — `npm run gen` |
| 450 shop upgrades | **verified** — `npm run stats` |
| 2 316 purchasable levels | **verified** — `npm run gen`; spec said ~2 500 until corrected |
| 8 branches, 8 currencies, distinct faucets | **verified** — `src/data/branches.ts` |
| gateways never upgradable (`maxLevel: 1`) | **verified** — generator output |
| balance targets (first gateway ~8 min, job hop 60–75 min) | **unverified** — authored, never measured |
| source layout (section 5) | **corrected** — spec listed modules that never existed |

## What it changed in the wiki

Created [[overview]], [[currency-model]], [[gateway-rule]], [[faucet-antagonism]] and the
eight branch entity pages.

## Contradictions found

1. Level count: spec said about 2 500, generator prints 2 316. Spec corrected to the printed
   value. The arithmetic behind 2 316 is on [[gateway-rule]].
2. Upgrade count: spec header said ~440, its own table totalled ~450, generator prints 450.
   Both spec figures corrected.
3. Source layout: spec section 5 listed `ui/tabs.ts`, `ui/skills.ts`, `ui/track.ts`,
   `ui/career.ts`, `ui/awards.ts`, `ui/prestige.ts`. None exist. Real modules are
   `ui/shell.ts`, `ui/branches.ts`, `ui/panels.ts`. Spec corrected to the tree on disk.

All three are the same failure: the spec was written ahead of the code and never re-checked
against what the generator prints. That is exactly the drift the lint pass exists to catch.
