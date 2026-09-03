# Zero to Ten-X — content & systems plan (v2)

This document is the spec the code implements. If code and this file disagree, this file
is the intent and the code is the bug.

---

## 1. What changed from v1

| | v1 (single-file artifact) | v2 (this project) |
|---|---|---|
| Skills | 33 core + 7 track nodes, one currency (KP) | **600 skills across 8 branches**, each branch with its **own currency** |
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

## 3. Skill catalogue — 600 skills

```
  8  global gateways          one-time, KP,  no upgrades
  8  branch gateways          one-time, KP,  no upgrades
 48  sub-path gateways        one-time, branch currency, no upgrades   (6 per branch)
536  upgradable skills        branch currency, 3–12 levels each        (67 per branch)
---
600 total
```

### Rule: gateways are never upgradable

> "skills to open path/branches must have only one time purchase (without upgrades)"

A gateway has `maxLevel: 1` and `gateway: true`. The UI shows **Open** instead of a level
counter, and the buy handler refuses a second purchase. Gateways carry a modest permanent
effect so opening one is never a pure tax, but their real payload is *access*.

Gateway hierarchy. The first three global gateways ask for **breadth** — branches opened;
the next three ask for **depth** — those same branches taken to their third sub-path; the
last one asks for all of it.

```
G0  First Principles ......... free-ish root, opens everything
 ├─ G1  Two Ways To Learn .... 2 branch gateways
 ├─ G2  The Wide Net ......... 3 more branch gateways
 ├─ G3  Nothing Left To Open . the last 3 branch gateways
 ├─ G4  Second Wind .......... algorithms + systems at sub-path 3
 ├─ G5  The Deep End ......... craft + business + data at sub-path 3
 ├─ G6  All The Way Down ..... security + community + research at sub-path 3
 └─ G7  The End Of The Map ... every branch at sub-path 6

B1..B8  branch gateways ...... require G0, cost KP, open a currency faucet
 └─ S1..S6 per branch ........ sub-path gateways, cost branch currency,
                               open tiers 2..7 of that branch
```

### Upgradable skill shape

```ts
{
  id, branch, name, desc,
  tier,            // 1..7, depth inside the branch
  req: string[],   // prerequisite skill ids (AND)
  reqLevel,        // level each prerequisite must reach; 1 unless stated, 3 at tier 7
  kind,            // effect family — decides what the levels do
  power,           // magnitude of one level
  cost,            // cost of level 1, in branch currency
  costGrowth,      // multiplier per level, 1.42 at tier 1 rising to 2.2 at tier 7
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

### Pages

The game is not one screen. A left sidebar (a bottom bar with four slots and **More** at
≤860px) lists the pages the player has earned, and a fresh game starts with exactly one
of them. A page opens when its rule first becomes true; the rule is a pure function of
state in `src/core/unlocks.ts`, nothing is written to the save, and an old save opens with
everything it has already reached and no announcement. A new reveal is one log line, one
toast and a **new** badge that clears on the first visit.

| page | contents | opens when |
|---|---|---|
| Desk | editor, Write code, codebase health and Squash, specialisation signature, active effects, commit log | always |
| Tools | the 20 generators as a flat list, each with its eight tier upgrades as chips and a tiers-bought bar | the first tool is affordable, or any tool is owned |
| Skills | the tree — everything below this heading | `g0` is affordable, or any skill is owned, or rank ≥ 1 |
| Career | rank ladder, specialisation cards, mastery | rank ≥ 1 |
| Awards | achievements, in sections, with a progress bar on every countable one | the first award |
| Job Hop | prestige summary and perks; the button itself still needs 20M lines | 1M lines this run, or any hop, or any lifetime reputation |
| Stats | the numbers, branch currency table, mastery | 1 000 lines lifetime |
| Settings | save export / import / erase, theme, hotkeys | always, from the HUD gear |

All pages are mounted at boot and toggled, so the Desk keeps its ids for the 100 ms status
paint while another page is active. A **quick dock** (Write code, Squash) sits under the
sidebar on every page but the Desk, because the click loop is the game and the Game
Developer track's hype meter drains when clicking stops. The active page is in the URL
hash (`#/skills`), keys `1`–`9` jump between unlocked pages, and the last page is restored
on reload with the rest of the view state (`zero10x.view.v1`).

### How the tree is shown

**Everything you can buy is one tree.** The Skills page is the only place in the game
that sells skills and upgrades: 600 skills, 902 upgrades and 20 generators, 1 522 nodes,
all drawn as one graph whose edges are the requirements that already live in the data —
`Skill.req`, `Upgrade.reqGen`, `reqBranch`, `reqTrack`. There is no separate upgrade
grid; that a generator upgrade wants 25 of that generator is a line on the canvas, not a
sentence in a tooltip. The one concession is the Tools page: a second view of the 20
generators and their 160 tier upgrades as a classic idle list, because the first five
minutes of a run are "buy a Notepad", and a canvas is a poor place to learn that. Tools
sells nothing the tree does not; the two views read the same state and the same prices.

The page draws that graph two ways, switched by a control beside the zoom buttons.

#### Progressive reveal — what a purchase is for

Two controls answer the question a tree of this size raises: *why should I buy this one?*

**A purchase opens the next ring.** By default the map shows what you have reached and
exactly one step further: a node is named when you own it, or when every prerequisite is
owned. Anything past that draws in its usual place — the layout never shifts under the
cursor — but as a dashed `???` with no price and no button, and the search box will not
match it. Buying a gateway therefore *does* something visible beyond its own effect: the
tier behind it acquires names. A fresh save shows one skill (`g0`); opening a branch takes
the named skills from 9 to 22, and its first sub-path to 35. The rule lives in
`src/core/reveal.ts` as a pure function of state — nothing is written to the save, so a
node can never be un-discovered and an imported save shows exactly what it has earned.
A **Earned / Everything** switch beside the density buttons turns the veil off for anyone
who would rather read the whole map.

**Every node says what it is worth.** The detail panel carries an *After one more* block:
the real before-and-after of LOC/s, income, knowledge, click power, bug rate, bug bite,
debug power, auto-cleanup, tool prices, offline rate and cap, luck, and every branch
currency — but only the rows this particular purchase actually moves. A bug-rate skill
shows a bug-rate line; an output skill shows LOC/s. The numbers come from
`src/core/preview.ts`, which forks the state, applies the purchase to the copy and runs
the same `derive` the live game runs, so the promise on the panel and the number a second
after clicking are produced by one piece of code and cannot drift apart. Underneath it an
**opens** row lists what this node unlocks; entries you have not discovered are listed but
not named.

#### Web — the radial map

The default. One canvas, you at the centre, the game around you. A node with children
carries a chevron: the chevron folds its sector away, the body of the node selects it. Only
the centre and Foundation are open on a fresh game, and the map grows as you open what you
care about. 1 564 nodes exist in total: the 1 522 purchasable ones plus the centre, the
folds, sixteen ranks and seven specialisations.

**Every purchasable node sells itself.** A node shows its name, its level and a button with
the price: `+1 8 ✓` for a skill, `×1 $662` for a tool, `Open 5 KP` for a gateway, `Buy $1.4K`
for an upgrade. The `×1 / ×10 / Max` switch beside the zoom buttons sets how many the button
buys (it is the same `bulk` the Tools page uses); `B` buys the selected node from the
keyboard, `Shift+B` buys as many as the balance allows. A locked node has no button — its
tooltip says what it needs — and a maxed one reads "owned" or "open". The detail panel keeps
the description, the requirement and the edges, and sits beside the map, not under it.

**The map is a necklace, not a set of rings.** Hubs, the branch gateways and the taps are
*clusters*: an open cluster lays its subtree out on its own — as rings around its root, or
as a grid under it for a hub whose children are all leaves (the money ladders, the taps, the
specialisations, each branch's eight upgrades) — and rides as one circle on a single
necklace around you, in tree order, joined to its parent by an arc. A closed cluster is a
box on the same necklace. Inside a cluster, a ring is only as long as the boxes on it need
and a subtree gets the angle its own boxes take up, so neighbours sit shoulder to shoulder.
Fit never drops below 60%: names stay names, and a map that does not fit at 60% scrolls.

```
YOU (main.py, your click)
├─ Setup ............ 12 tools, each with its eight upgrade tiers          108
├─ Upgrades ......... output · income · knowledge ladders                 160
│   ├─ Manual lines (anchor) → the 40 click upgrades
│   └─ Bugs squashed (anchor) → the 48 quality upgrades
├─ Career ........... 16 ranks as a spine, 7 specialisations               65
└─ Foundation (g0) .. g1 · g2 · g3
    └─ the 8 branch gateways — a branch hub *is* its gateway
        ├─ 3 sub-gateways, tiers 1–5                                       36 each
        └─ <branch> upgrades (fold) → the branch's 8 money upgrades       9 each
```

Ranks, specialisations and the two taps (lines typed by hand, bugs squashed) are a node
kind of their own: **anchors**. Nothing buys them; they exist so that "needs rank 7" is a
line you can follow instead of a sentence you have to trust.

Every requirement in the data becomes an edge, and edges come in families you can switch
on and off. Anything that is not a parent–child link is drawn as an arc bowed towards the
centre — bundled, so forty cross-branch links read as a few strands rather than felt.

| family | what it joins | count | on by default |
|---|---|---|---|
| `tree` | parent to child in the hierarchy above | 801 | always |
| `requires` | `Skill.req` that is not already a parent link | 80 | yes |
| `career` | rank → the upgrades it gates (`reqRank`) | 202 | no |
| `affects` | skill → the tools it multiplies (`gens[]`), `cheaper` skills → Setup | 67 | no |
| `currency` | `crossCurrency.target` → the other branch's hub | 40 | yes |
| `fight` | Craft ↔ Security, the two branches fighting over one tap | 2 | yes |

802 nodes in total: the 762 you can buy, plus the centre, fourteen folds (six hubs and one
upgrade shelf per branch), sixteen ranks, seven specialisations and the two taps. `reqTrack` and `reqClicks`/`reqBugsKilled` need no family
of their own — those upgrades already hang under their specialisation or their tap.

Whatever the switches say, selecting a node lights every edge it owns.

Beside the zoom buttons sits a density switch, **Tight** (the default) and **Roomy**: it
halves every gap — between rows, between rings, between neighbours on a ring — without
touching the clearance terms, so a denser map is never an overlapping one. Both layouts
read the same metrics, so the flat view tightens with it.

Two links deliberately go undrawn: the `fx.gens` of the 96 generator upgrades and the
`fx.cur` of the 64 branch upgrades. In both the effect edge would land on the node that is
already the parent, so drawing it would double the line and say nothing.

#### Layers — the flat view

762 nodes fanned out at once is a map, not a shop, so the second mode keeps the graph cut
into **layers** with a rail on the left. Layers are not categories bolted on top — each is
a connected region of the same graph, and the edge between two layers is a node you click
to walk through (a branch gateway on Foundation opens that branch's layer). Buying eight
tool tiers in a row is faster in a grid than in a fan; that is what this mode is for.

| layer | nodes | canvas shape |
|---|---|---|
| Setup | 20 generators + 160 generator upgrades = 180 | row 0 the generators, rows 1–8 their upgrade ladders; one column per tool |
| Foundation | `g0`, the 8 branch gateways, `g1`–`g7` = 16 | the map of the game; a branch node walks into that branch |
| each branch ×8 | 74 skills + 12 branch upgrades = 86 | tier per row, gateway trunk down the middle, branch upgrades under the gateway |
| Upgrades | 576 (+10 for the current specialisation) | one lane per family — output, income, click, quality, knowledge, offline, luck — descending by price |

The branch layer is built by walking the gateways in order and dropping the tier they open
between them, so a branch that grows a seventh tier needs no change here — and neither does
Foundation, which lists whatever global gateways the data holds.

A tier is a row, the gateway trunk runs down the middle, and every requirement is drawn as
an edge — an edge lights up once its parent is owned deep enough, which is how the tier-7
threshold becomes visible instead of surprising. Nodes are compact (name, level, progress)
and a panel underneath carries the description, the price and the buy buttons: `+1 / +10 /
Max` for a skill, `×1 / ×10 / Max` for a generator, one `Buy` for an upgrade. Structure is
built once per layer and only repainted afterwards, so zoom, scroll and selection survive
the page's periodic refresh.

A search box above the canvas matches names across **all** layers at once and highlights
the hits; a result is a button that switches layer, selects the node and scrolls it into
view. The old shop filters survive as highlight modes — available, affordable, owned, all.

### Distribution per branch (67 upgradable + 6 sub-gateways)

| tier | count | unlocked by | level cap | cost of level 1 |
|---|---|---|---|---|
| 1 | 12 | branch gateway | 12 | 8 – 38 |
| 2 | 12 | sub-gateway S1 | 10 | 95 – 450 |
| 3 | 12 | sub-gateway S2 | 8 | 1 500 – 7 110 |
| 4 | 10 | sub-gateway S3 | 6 | 24 000 – 97 920 |
| 5 | 8 | sub-gateway S4 | 5 | 420 000 – 1 419 600 |
| 6 | 8 | sub-gateway S5 | 4 | 8.4M – 28.4M |
| 7 | 5 | four tier-6 skills at level ≥ 3, behind S6 | 3 | 190M – 448M |

Costs fan out across a tier — each position costs 34% more than the last, and a skill whose
effect is its own branch currency costs 1.6× on top, so the compounding ones are never the
cheapest thing on screen. Sub-path gateways cost 140 / 3 200 / 90 000 / 2.4M / 70M / 2.2B of
the branch currency.

The **effect-kind rotation** shifts by one per tier, and a per-position jitter table of six
entries runs against the eight-kind rotation, so inside a twelve-name tier every skill reads
differently — the generator refuses to emit two rows in one branch and tier whose sentence is
identical, and a four-entry jitter table would collide at position 8.

Total purchasable *levels* across all 600 skills: **4 120** (`npm run gen` reports it).

---

## 4. Shop upgrades — 902

Bought with money, reset on a job hop, unchanged in spirit from v1 — just far more of them.

| family | count | how it is built |
|---|---|---|
| Generator tiers | 20 gens × 8 tiers = **160** | unlock at 10 / 25 / 50 / 100 / 175 / 250 / 350 / 500 owned |
| Global output | 48 × 3 = **144** | authored ladder, escalating cost and rank requirement |
| Income | 36 × 3 = **108** | ditto |
| Click power | 28 × 3 = **84** | gated on manual lines rather than rank |
| Bugs & quality | 32 × 3 = **96** | tier 1 slows bugs, tier 2 softens them, tier 3 sharpens debugging |
| Knowledge | 24 × 3 = **72** | ditto |
| Offline | 12 × 3 = **36** | raises the offline rate and adds an hour of cap each |
| Luck | 12 × 3 = **36** | opportunity frequency |
| Branch-flavoured | 8 × 12 = **96** | require that branch's gateway to be open |
| Track-exclusive | 7 × 10 = **70** | require that specialisation |
| **Total** | **902** | |

Every ladder now runs three tiers deep rather than two, so the cost growth per step was
softened to keep the top of each ladder inside the money curve the 20 tools produce, and
the rank requirement is spread evenly over the ladder instead of stepping every four
entries. The two new families use `Fx` fields that already existed — `offEff`/`offCap`
and `luck` — so nothing in the engine had to learn a new effect.

Generated by `scripts/gen-content.mjs` from authored name/description pools so every entry has
a real name and a real effect, then written to `src/data/upgrades.generated.ts` and committed.

Upgrades are **not** a separate screen. Each family hangs where its requirement points:
generator tiers under their tool on the Setup layer, branch-flavoured ones under that
branch's gateway, track-exclusive ones on the Upgrades layer beside the five money-bought
ladders. See §3 "How the tree is shown".

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
   ├─ main.ts                  boot, game loop, offline catch-up, page reveals
   ├─ styles/
   │  ├─ base.css              tokens, HUD, desk, modals, chips
   │  ├─ nav.css               sidebar, bottom bar, quick dock, toasts
   │  ├─ pages.css             tools list, career, awards, hop, stats, settings
   │  └─ tree.css              the Skills page canvas
   ├─ core/
   │  ├─ types.ts              Fx, Skill, Upgrade, GameState …
   │  ├─ format.ts             number formatting
   │  ├─ bus.ts                pub/sub log so core never imports the UI
   │  ├─ state.ts              new game, migrate, prestige reset
   │  ├─ effects.ts            effectOf(skill, level), applyFx, Derived
   │  ├─ engine.ts             derive(state, out), recompute(), tick(), faucets
   │  ├─ actions.ts            click, debug, buy*, job hop
   │  ├─ events.ts             opportunities and their outcomes
   │  ├─ unlocks.ts            which pages the player has earned — pure functions of state
   │  ├─ reveal.ts             which nodes have been discovered — also pure, also unsaved
   │  ├─ preview.ts            what a purchase would do, by running derive() on a fork
   │  └─ save.ts               localStorage + export / import
   ├─ data/
   │  ├─ generators.ts  ranks.ts  branches.ts  tracks.ts
   │  ├─ achievements.ts  perks.ts  snippets.ts
   │  ├─ skills.generated.ts     ← 600 skills
   │  └─ upgrades.generated.ts   ← 902 upgrades
   └─ ui/
      ├─ dom.ts  shell.ts  modal.ts  status.ts
      ├─ router.ts            the Page contract, go(id), hash sync, keys 1–9
      ├─ nav.ts               sidebar / bottom bar markup and badges
      ├─ toast.ts             the fixed toast stack
      ├─ viewstore.ts         zero10x.view.v1: tree view state + last page + seen pages
      ├─ pages/
      │  ├─ desk.ts  tools.ts  skills.ts  career.ts
      │  └─ awards.ts  hop.ts  stats.ts  settings.ts
      ├─ tree.ts              generic canvas: layouts, edges, nodes, zoom — no game rules
      ├─ treemodel.ts         what a node *is*: layers, specs, live status, buy dispatch
      ├─ treegraph.ts         the whole game as one graph: hierarchy, edge families, anchors
      └─ treetab.ts           the Skills page: web/layers, rail, canvas, search, detail panel
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
| Tier-7 branch capstone | run 8+, needs the branch's own currency compounding |

**Awards are worth 0.6% each, not 1%.** The catalogue went from 39 to 94, and the bonus is
flat per award (`AWARD_BONUS` in `src/core/engine.ts`); at 1% the doubling would have
quietly turned a +39% ceiling into +90%. At 0.6% a complete set is worth about +56%, which
is a little more than before and in proportion to the work it now takes.

`npm run stats` prints actual counts — skills, upgrades, tools and awards — so the numbers
in this file stay honest.

---

## 7. Deliberately out of scope for v2

- Server-side saves. Everything is `localStorage` plus manual export/import.
- Sound.
- Mobile pinch-zoom on the tree. The canvas scrolls, drags with the pointer, and has zoom
  buttons plus a Tight/Roomy density switch; two-finger zoom is not wired up.
- Progressive reveal of generators. A tool you cannot afford yet is dimmed, not hidden:
  the Setup layer is a fixed grid of columns, and hiding a column would make the canvas
  jump under the player's cursor. Skills and shop upgrades *are* revealed progressively
  (see §3), but they keep their slot in the layout for exactly the same reason — an
  undiscovered node is veiled, never absent.
