---
type: entity
id: craft
updated: 2026-09-03
sources: [plan-md]
code: [src/data/branches.ts, src/data/skills.generated.ts, src/ui/branches.ts]
---

# Craft

> Quality as a strategy. Fewer bugs, softer bites, faster cleanup.

| field | value |
|---|---|
| branch id | `craft` |
| currency | Trust (`✓`) |
| gateway cost | 90 KP |
| faucet | Earned for every bug closed, by hand or automatically. |

Every field above is read straight out of `src/data/branches.ts` — if this page and the
data disagree, the page is stale.

## Content

Same shape as every branch: 3 sub-path gateways plus 33 upgradable skills across 5 tiers,
289 purchasable levels. See [[gateway-rule]] for the tier table.

## Faucet

Earned for every bug closed, by hand or automatically. The currency does not accrue at all until the 90 KP gateway is bought — see
[[currency-model]].

## Notes

_Nothing ingested yet beyond [[plan-md]]. Add sources and this section fills in._

## Antagonism

This branch and its opposite number draw from the same tap from opposite ends — see
[[faucet-antagonism]].
