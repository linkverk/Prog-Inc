---
type: entity
id: security
updated: 2026-09-03
sources: [plan-md]
code: [src/data/branches.ts, src/data/skills.generated.ts, src/ui/branches.ts]
---

# Security

> Every defect is inventory. The opposite bet to Craft.

| field | value |
|---|---|
| branch id | `security` |
| currency | Findings (`⌖`) |
| gateway cost | 320 KP |
| faucet | Earned for every bug that appears — the tap Craft is trying to close. |

Every field above is read straight out of `src/data/branches.ts` — if this page and the
data disagree, the page is stale.

## Content

Same shape as every branch: 3 sub-path gateways plus 33 upgradable skills across 5 tiers,
289 purchasable levels. See [[gateway-rule]] for the tier table.

## Faucet

Earned for every bug that appears — the tap Craft is trying to close. The currency does not accrue at all until the 320 KP gateway is bought — see
[[currency-model]].

## Notes

_Nothing ingested yet beyond [[plan-md]]. Add sources and this section fills in._

## Antagonism

This branch and its opposite number draw from the same tap from opposite ends — see
[[faucet-antagonism]].
