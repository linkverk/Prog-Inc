---
type: entity
id: data
updated: 2026-09-03
sources: [plan-md]
code: [src/data/branches.ts, src/data/skills.generated.ts, src/ui/branches.ts]
---

# Data

> Scale reading itself back to you. Rewards raw throughput.

| field | value |
|---|---|
| branch id | `data` |
| currency | Signal (`∿`) |
| gateway cost | 320 KP |
| faucet | Accrues every second, scaled by the log of your LOC/s. |

Every field above is read straight out of `src/data/branches.ts` — if this page and the
data disagree, the page is stale.

## Content

Same shape as every branch: 3 sub-path gateways plus 33 upgradable skills across 5 tiers,
289 purchasable levels. See [[gateway-rule]] for the tier table.

## Faucet

Accrues every second, scaled by the log of your LOC/s. The currency does not accrue at all until the 320 KP gateway is bought — see
[[currency-model]].

## Notes

_Nothing ingested yet beyond [[plan-md]]. Add sources and this section fills in._
