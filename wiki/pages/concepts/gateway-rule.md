---
type: concept
id: gateway-rule
updated: 2026-09-03
sources: [plan-md]
code: [scripts/gen-content.mjs, src/data/skills.generated.ts, src/core/actions.ts]
---

# The gateway rule

36 of the 300 skills are gateways. A gateway has `maxLevel: 1` and `gateway: true`. The UI
shows **Open** instead of a level counter; the buy handler refuses a second purchase.

Verified: `npm run gen` prints `36 gateways, 264 upgradable`.

## Hierarchy

```
G0  First Principles ......... root, opens everything
 |- G1  Two Ways To Learn .... requires 2 branch gateways
 |- G2  The Wide Net ......... requires 5 branch gateways
 \- G3  Nothing Left To Open . requires all 8 branch gateways

B1..B8  branch gateways ...... require G0, cost KP, open a currency faucet
 \- S1..S3 per branch ........ cost branch currency, open tiers 2 / 3 / 4
```

4 global + 8 branch + 24 sub-path = 36.

## Why they never upgrade

The design constraint, stated verbatim in `PLAN.md` section 3:

> "skills to open path/branches must have only one time purchase (without upgrades)"

An upgradable gateway would collapse two different decisions into one. Buying a level is a
*rate* decision — how fast this number goes up. Opening a gateway is a *structural* decision —
which parts of the game exist for me this run. Letting a gateway take levels turns access into
another multiplier, and the run-to-run variety described in [[currency-model]] comes entirely
from access being scarce and permanent.

Gateways still carry a modest permanent effect, so opening one is never a pure tax. But the
payload is access.

## Level distribution (upgradable skills)

| tier | per branch | unlocked by | level cap |
|---|---|---|---|
| 1 | 8 | branch gateway | 12 |
| 2 | 8 | sub-gateway S1 | 10 |
| 3 | 8 | sub-gateway S2 | 8 |
| 4 | 6 | sub-gateway S3 | 6 |
| 5 | 3 | four tier-4 skills at level 3+ | 3 |

Per branch: 8x12 + 8x10 + 8x8 + 6x6 + 3x3 = 289 levels. x8 branches = 2 312, plus the
4 global gateways = **2 316**, which is what `npm run gen` prints.
