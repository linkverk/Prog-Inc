---
type: entity
id: systems
updated: 2026-09-03
sources: [plan-md]
code: [src/data/branches.ts, src/data/skills.generated.ts, src/ui/branches.ts]
---

# Systems

> Machines, schedulers, and things that keep running without you.

| field | value |
|---|---|
| branch id | `systems` |
| currency | Uptime (`∞`) |
| gateway cost | 40 KP |
| faucet | Accrues every second, faster the more machines you own. |

Every field above is read straight out of `src/data/branches.ts` — if this page and the
data disagree, the page is stale.

## Content

Same shape as every branch: 3 sub-path gateways plus 33 upgradable skills across 5 tiers,
289 purchasable levels. See [[gateway-rule]] for the tier table.

## Faucet

Accrues every second, faster the more machines you own. The currency does not accrue at all until the 40 KP gateway is bought — see
[[currency-model]].

## Notes

_Nothing ingested yet beyond [[plan-md]]. Add sources and this section fills in._
