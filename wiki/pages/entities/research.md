---
type: entity
id: research
updated: 2026-09-03
sources: [plan-md]
code: [src/data/branches.ts, src/data/skills.generated.ts, src/ui/branches.ts]
---

# Research

> The long game. Pays you for committing knowledge, not hoarding it.

| field | value |
|---|---|
| branch id | `research` |
| currency | Proof (`∴`) |
| gateway cost | 1400 KP |
| faucet | Earned for every knowledge point you spend on gateways. |

Every field above is read straight out of `src/data/branches.ts` — if this page and the
data disagree, the page is stale.

## Content

Same shape as every branch: 3 sub-path gateways plus 33 upgradable skills across 5 tiers,
289 purchasable levels. See [[gateway-rule]] for the tier table.

## Faucet

Earned for every knowledge point you spend on gateways. The currency does not accrue at all until the 1400 KP gateway is bought — see
[[currency-model]].

## Notes

_Nothing ingested yet beyond [[plan-md]]. Add sources and this section fills in._
