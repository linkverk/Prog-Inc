# Zero to Ten-X — content & systems plan (v2)

This document is the spec the code implements. If code and this file disagree, this file
is the intent and the code is the bug.

---

## 1. What changed from v1

| | v1 (single-file artifact) | v2 (this project) |
|---|---|---|
| Skills | 33 core + 7 track nodes, one currency (KP) | **300 skills across 8 branches**, each branch with its **own currency** |
| Skill purchases | one click, done | every skill has **upgrade levels** (3–12), except gateways |
| Gateways | none | **36 one-time gateway skills** that open paths and can never be upgraded |
| Shop upgrades | 44 | **450** (10×) |
| Currencies | LOC, $, KP, ★ | LOC, $, KP, ★ **+ 8 branch currencies** |
| Delivery | one HTML file | Vite + TypeScript project, modular source |

---

## 2. Currency model

### Global currencies

| Currency | Symbol | Earned by | Spent on |
|---|---|---|---|
| Lines of Code | LOC | clicking + generators | nothing — it is the career metric that gates ranks |
| Money | `$` | every line written, × income multipliers | generators, shop upgrades |
| Knowledge | KP | every line written, × knowledge multipliers | **gateway skills only** |
| Reputation | ★ | job hops (prestige) | permanent perks |

KP has exactly one job in v2: **buying gateways**. That makes the decision "which branch do I
open this run?" instead of "which of 300 things do I buy with one pile".

### Branch currencies

Eight branches, eight currencies. A branch currency **does not accrue at all** until that
branch's gateway is bought. Each has a genuinely different faucet, so which branches you open
changes how you play, not just what you buy.

| Branch | Currency | Symbol | Faucet — how you gain it |
|---|---|---|---|
| Algorithms | Insight | `◇` | **per manual line typed.** Rewards clicking. Idle play earns none. |
| Systems | Uptime | `∞` | **per second**, scaled by `sqrt(machines owned)`. Rewards long sessions and buying machines. |
| Craft | Trust | `✓` | **per bug closed.** Squashing and auto-cleaning both count. |
| Business | Capital | `¤` | **a slice of every dollar earned.** Scales with income multipliers. |
| Data | Signal | `∿` | **per second**, scaled by `log10(LOC/s)`. Rewards raw output scale, not clicking. |
| Security | Findings | `⌖` | **per bug that appears.** The exact opposite faucet to Craft — they fight over the same tap. |
| Community | Karma | `♥` | **per opportunity caught, per promotion, and passively from OSS Contributors.** |
| Research | Proof | `∴` | **per KP spent.** Only flows when you open more gateways — a currency that pays you for committing. |

Design note: Craft and Security are deliberately antagonistic. Craft wants bugs closed fast,
Security wants bugs to exist. Opening both is possible but the two faucets throttle each other,
which is the point.

---

## 3. Skill catalogue — 300 skills

```
  4  global gateways          one-time, KP,  no upgrades
  8  branch gateways          one-time, KP,  no upgrades
 24  sub-path gateways        one-time, branch currency, no upgrades   (3 per branch)
264  upgradable skills        branch currency, 3–12 levels each        (33 per branch)
---
300 total
```

### Rule: gateways are never upgradable

> "skills to open path/branches must have only one time purchase (without upgrades)"

A gateway has `maxLevel: 1` and `gateway: true`. The UI shows **Open** instead of a level
counter, and the buy handler refuses a second purchase. Gateways carry a modest permanent
effect so opening one is never a pure tax, but their real payload is *access*.

Gateway hierarchy:

```
G0  First Principles ......... free-ish root, opens everything
 ├─ G1  Two Ways To Learn .... requires 2 branch gateways
 ├─ G2  The Wide Net ......... requires 5 branch gateways
 └─ G3  Nothing Left To Open . requires all 8 branch gateways

B1..B8  branch gateways ...... require G0, cost KP, open a currency faucet
 └─ S1..S3 per branch ........ sub-path gateways, cost branch currency,
                               open tiers 2 / 3 / 4 of that branch
```

### Upgradable skill shape

```ts
{
  id, branch, name, desc,
  tier,            // 1..5, depth inside the branch
  req: string[],   // prerequisite skill ids (AND)
  reqLevel,        // level each prerequisite must reach; 1 unless stated, 3 at tier 5
  kind,            // effect family — decides what the levels do
  power,           // magnitude of one level
  cost,            // cost of level 1, in branch currency
  costGrowth,      // multiplier per level, 1.42 at tier 1 rising to 2.2 at tier 5
  maxLevel         // 3 – 12
}
```

`effectOf(skill, level)` turns that into a concrete `Fx`. Multiplicative kinds compound as
`(1 + power) ^ level`; additive kinds accumulate as `power × level`. One data row therefore
produces up to twelve distinct purchases, and the numbers stay legible in the source.

### Effect kinds

| kind | what a level does |
|---|---|
| `output` | × all code output |
| `clickPower` | × click power |
| `clickPct` | + % of LOC/s added to each click |
| `income` | × money |
| `knowledge` | × KP gain |
| `genGroup` | × output of a named set of generators |
| `bugSlow` | − bug appearance rate |
| `bugSoften` | − how much bugs throttle output |
| `debugPower` | × bugs closed per debug session |
| `autoClean` | + passive bug cleanup |
| `cheaper` | − generator cost |
| `offline` | + offline rate / cap |
| `luck` | × opportunity frequency |
| `currency` | × this branch's own currency gain |
| `crossCurrency` | × a **different** branch's currency gain — the reason to open several |

Each branch draws on **eight kinds, all different**, which is what gives it a character:
Craft owns the bug-and-quality family, Business owns income and discounts, Systems owns
machines and offline. The rotation shifts by one per tier, and the magnitude of a level
varies with position (×0.85 to ×1.3), so no two skills in one branch and tier read alike.

### How the tree is shown

The branches tab is a canvas, not a list. A tier is a row, the gateway trunk runs down the
middle, and every `req` is drawn as an edge — an edge lights up once its parent is owned
deep enough, which is how the tier-5 threshold becomes visible instead of surprising.
Foundation is the map of the whole game: `g0`, the eight branch gateways it opens, then
`g1`/`g2`/`g3`; picking a branch node walks into that branch. Nodes are compact (name,
level, progress) and a panel underneath carries the description, the price and the buy
buttons. Structure is built once per branch and only repainted afterwards, so zoom, scroll
and selection survive the tab's periodic refresh.

### Distribution per branch (33 upgradable + 3 sub-gateways)

| tier | count | unlocked by | level cap | cost of level 1 |
|---|---|---|---|---|
| 1 | 8 | branch gateway | 12 | 8 – 27 |
| 2 | 8 | sub-gateway S1 | 10 | 95 – 321 |
| 3 | 8 | sub-gateway S2 | 8 | 1 500 – 5 070 |
| 4 | 6 | sub-gateway S3 | 6 | 24 000 – 64 800 |
| 5 | 3 | four tier-4 skills at level ≥ 3 | 3 | 420 000 – 900 480 |

Costs fan out across a tier — each position costs 34% more than the last, and a skill whose
effect is its own branch currency costs 1.6× on top, so the compounding ones are never the
cheapest thing on screen. Sub-path gateways cost 140 / 3 200 / 90 000 of the branch currency.

Total purchasable *levels* across all 300 skills: **2 316** (`npm run gen` reports it).

---

## 4. Shop upgrades — 450 (10× v1)

Bought with money, reset on a job hop, unchanged in spirit from v1 — just far more of them.

| family | count | how it is built |
|---|---|---|
| Generator tiers | 12 gens × 8 tiers = **96** | unlock at 10 / 25 / 50 / 100 / 175 / 250 / 350 / 500 owned |
| Global output | **72** | authored ladder, escalating cost and rank requirement |
| Income | **56** | ditto |
| Click power | **40** | ditto |
| Bugs & quality | **48** | ditto |
| Knowledge | **32** | ditto |
| Branch-flavoured | 8 × 8 = **64** | require that branch's gateway to be open |
| Track-exclusive | 7 × 6 = **42** | require that specialisation |
| **Total** | **450** | |

Generated by `scripts/gen-content.mjs` from authored name/description pools so every entry has
a real name and a real effect, then written to `src/data/upgrades.generated.ts` and committed.

---

## 5. Source layout

```
zero-to-ten-x/
├─ PLAN.md                     ← you are here
├─ README.md                   how to run it
├─ index.html                  Vite entry
├─ package.json                scripts: dev, gen, stats, typecheck, build, preview
├─ tsconfig.json               strict, noEmit — `npm run typecheck`
├─ vite.config.ts
├─ scripts/
│  ├─ gen-content.mjs          writes the two generated data files
│  └─ content-stats.mjs        prints the real counts (verify the claims above)
└─ src/
   ├─ main.ts                  boot
   ├─ styles.css
   ├─ core/
   │  ├─ types.ts              Fx, Skill, Upgrade, GameState …
   │  ├─ format.ts             number formatting
   │  ├─ bus.ts                pub/sub log so core never imports the UI
   │  ├─ state.ts              new game, migrate, prestige reset
   │  ├─ effects.ts            effectOf(skill, level), applyFx, Derived
   │  ├─ engine.ts             recompute(), tick(), branch-currency faucets
   │  ├─ actions.ts            click, debug, buy*, job hop
   │  ├─ events.ts             opportunities and their outcomes
   │  └─ save.ts               localStorage + export / import
   ├─ data/
   │  ├─ generators.ts  ranks.ts  branches.ts  tracks.ts
   │  ├─ achievements.ts  perks.ts  snippets.ts
   │  ├─ skills.generated.ts     ← 300 skills
   │  └─ upgrades.generated.ts   ← 450 upgrades
   └─ ui/
      ├─ dom.ts  shell.ts  modal.ts  status.ts
      ├─ tree.ts              skill-tree canvas: layout, edges, nodes, zoom
      ├─ setup.ts  shop.ts  branches.ts
      └─ panels.ts            career, awards, track, prestige, stats, offline report
```

---

## 6. Balance targets

| milestone | target time, active play |
|---|---|
| First branch gateway | ~8 min |
| Second branch gateway | ~25 min |
| First sub-gateway (tier 2) | ~35 min |
| First job hop | ~60–75 min |
| Four branches open in one run | run 3–4 |
| All eight open in one run | run 6+, needs Research + Community compounding |
| Tier-5 branch capstone | run 5+ |

`npm run stats` prints actual counts so the numbers in this file stay honest.

---

## 7. Deliberately out of scope for v2

- Server-side saves. Everything is `localStorage` plus manual export/import.
- Sound.
- Mobile pinch-zoom on the tree (scroll + zoom buttons only).
