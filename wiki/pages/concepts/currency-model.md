---
type: concept
id: currency-model
updated: 2026-09-03
sources: [plan-md]
code: [src/data/branches.ts, src/core/engine.ts, src/core/types.ts]
---

# Currency model

Twelve currencies: four global, eight branch-local.

## Global

| currency | symbol | faucet | sink |
|---|---|---|---|
| Lines of Code | LOC | clicking + generators | **none** — pure career metric, gates ranks |
| Money | `$` | every line, x income multipliers | generators, shop upgrades |
| Knowledge | KP | every line, x knowledge multipliers | **gateways only** |
| Reputation | star | job hops | permanent perks |

LOC having no sink is deliberate: it is the score, not a resource. Spending it would make
the career ladder negotiable.

## The KP restriction

Knowledge buys gateways and nothing else. With one pile and 300 things to spend it on, the
question each session is "which of these 300?" — a shopping problem. With KP locked to
gateways, the question becomes **"which branch do I open this run?"** — a commitment problem
with a different answer every run. See [[gateway-rule]].

## Branch currencies

A branch currency does not accrue *at all* until its gateway is bought
(`src/data/branches.ts:5`). Opening a branch is switching on a faucet, not unlocking a shelf.

| branch | currency | sym | faucet | gate cost (KP) |
|---|---|---|---|---|
| [[algorithms]] | Insight | diamond | per line typed by hand; idle gives none | 40 |
| [[systems]] | Uptime | infinity | per second, faster with more machines | 40 |
| [[craft]] | Trust | check | per bug closed, by hand or automatically | 90 |
| [[business]] | Capital | currency | a slice of every dollar earned | 90 |
| [[data]] | Signal | wave | per second, scaled by log of LOC/s | 320 |
| [[security]] | Findings | target | per bug that *appears* | 320 |
| [[community]] | Karma | heart | per opportunity, per promotion, passive from contributors | 1400 |
| [[research]] | Proof | therefore | per KP spent on gateways | 1400 |

Gate costs come from `src/data/branches.ts` and form four tiers: 40 / 90 / 320 / 1400.
Two branches at each price, so every choice is between two genuinely different play patterns
at the same cost.

## Faucet shapes

The faucets are not reskins of each other — they respond to different behaviour:

- **Click-driven**: Insight. Idle play earns literally zero.
- **Time-driven**: Uptime, Signal. Reward long sessions; Signal additionally needs scale.
- **Event-driven**: Trust, Findings, Karma. Hooks `faucetOnSquash`, `faucetOnBugsAppear`,
  `faucetOnOpportunity`, `faucetOnPromotion` in `src/core/engine.ts:242-262`.
- **Economy-driven**: Capital rides income multipliers.
- **Spend-driven**: Proof only flows while you are spending KP — it pays for commitment and
  stops the moment you start hoarding.

Related: [[faucet-antagonism]].
