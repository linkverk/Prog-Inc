---
type: entity
id: business
updated: 2026-09-03
sources: [plan-md]
code: [src/data/branches.ts, src/data/skills.generated.ts, src/ui/branches.ts]
---

# Business

> Getting paid for it. Rates, leverage, and other people's budgets.

| field | value |
|---|---|
| branch id | `business` |
| currency | Capital (`¤`) |
| gateway cost | 90 KP |
| faucet | A slice of every dollar you earn. |

Every field above is read straight out of `src/data/branches.ts` — if this page and the
data disagree, the page is stale.

## Content

Same shape as every branch: 3 sub-path gateways plus 33 upgradable skills across 5 tiers,
289 purchasable levels. See [[gateway-rule]] for the tier table.

## Faucet

A slice of every dollar you earn. The currency does not accrue at all until the 90 KP gateway is bought — see
[[currency-model]].

## Notes

_Nothing ingested yet beyond [[plan-md]]. Add sources and this section fills in._
