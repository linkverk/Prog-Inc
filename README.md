# Zero to Ten-X

An incremental career game. You start with an empty folder and a blinking cursor and end
somewhere near the top of the field — via tools, bugs, promotions, a specialisation, eight
skill branches with eight separate currencies, and as many job hops as it takes.

TypeScript + Vite, no runtime dependencies.

---

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

In VS Code: open the folder, then **Run Task → dev** (or `Ctrl/Cmd+Shift+B`).
`Run and Debug → Play (Chrome…)` attaches a debugger once the dev server is up.

## Scripts

| command | what it does |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | regenerate content, typecheck, then production build into `dist/` |
| `npm run preview` | serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run gen` | regenerate `src/data/*.generated.ts` |
| `npm run stats` | print the real content counts |

`npm run stats` right now:

```
SKILLS 300
  gateways (one-time, no upgrades): 36
  upgradable: 264
  purchasable levels: 2316
UPGRADES 450
```

---

## How the game works

**Four global currencies.** Lines of code gate your rank. Money buys tools and shop
upgrades. Knowledge (KP) buys *gateways only*. Reputation (★) buys permanent perks and is
earned by quitting your job.

**Eight branches, eight currencies.** Each branch has its own currency with its own faucet,
and the faucet does not run at all until you buy that branch's gateway with KP:

| Branch | Currency | Earned by |
|---|---|---|
| Algorithms | Insight ◇ | every line you type by hand |
| Systems | Uptime ∞ | per second, scaled by machines owned |
| Craft | Trust ✓ | every bug you close |
| Business | Capital ¤ | a slice of every dollar earned |
| Data | Signal ∿ | per second, scaled by raw output |
| Security | Findings ⌖ | every bug that *appears* — Craft's opposite |
| Community | Karma ♥ | opportunities, promotions, contributors |
| Research | Proof ∴ | every KP you spend |

Opening Craft and Security in the same run is legal and awkward on purpose: one wants bugs
gone, the other wants them to exist.

**Gateways are one-time.** 36 of the 300 skills open a path — the four global ones, the eight
branch ones, and three sub-paths inside each branch. They cost once and can never be
levelled. Everything else has 3 to 12 levels, 2,316 purchasable levels in total.

**One tree, not three shops.** Everything you can buy — 300 skills, 450 upgrades, 12 tools —
is one graph on the **Tree** tab, wired by what unlocks what. Zoom with the buttons, drag the
canvas around, buy from the panel underneath: `+1 / +10 / Max` for a skill, `×1 / ×10 / Max`
for a tool, one **Buy** for an upgrade.

**Web** is the default view: you in the middle, and 794 nodes fanning out in rings — your
tools, the money ladders, your rank ladder and the eight branches. A chevron folds a whole
region away, so the map starts as sixteen nodes and grows where you look. Ranks, the seven
specialisations and the two taps (lines typed by hand, bugs squashed) are on the map too,
which is how "needs rank 7" becomes a line you can follow. Anything that is not a
parent–child link arcs across the centre, and the chips under the zoom buttons switch those
families on and off: `requires`, `currency` (a branch skill paying a *different* branch),
`rivalry` (Craft and Security fighting over the same bugs), `career`, `affects`. Whatever
the chips say, selecting a node lights every edge it owns.

**Tight / Roomy** beside the zoom buttons sets how much air sits between nodes. Tight is the
default and halves every gap; the choice is remembered along with your view.

**Layers** is the flat view for shopping: a rail on the left picks one region and lays it
out in a grid — your **Setup** (each tool with its eight upgrade tiers), **Foundation** (the
map of all eight branches), the **branches** themselves (tier per row, gateway trunk down
the middle), and **Upgrades** (a lane per family, cheapest at the top). Buying eight tool
tiers in a row is faster here than in a fan.

**Search hits every layer at once.** Type a name and matches light up wherever they live;
the lens beside it — available, affordable now, owned — dims everything else.

**450 shop upgrades**, bought with money and lost on a job hop, live in that same tree:
tool tiers under their tool, branch-flavoured ones under that branch's gateway,
track-exclusive ones beside the five money ladders.

**Seven specialisations** picked at rank 4, each with its own 13-rung ladder and one
mechanic nobody else gets — releases, a hype meter, bug bounties, machine scaling, knowledge
scaling, compounding upgrades, or cheap tools. Job hops bank permanent mastery in the track
you just left.

---

## Where things live

```
src/core/     rules — no DOM in here
  types.ts      Fx, Skill, Upgrade, GameState
  effects.ts    effectOf(skill, level) and the Fx accumulator
  engine.ts     recompute(), tick(), the eight faucets
  actions.ts    click, debug, buy, job hop
  state.ts      new game, migrate, prestige reset
  save.ts       localStorage + export/import
  events.ts     opportunities and incidents
src/data/     content — mostly data, no logic
  *.generated.ts  written by scripts/gen-content.mjs, committed on purpose
src/ui/       rendering — reads core, never mutates it directly
```

Adding a skill or an upgrade means editing `scripts/gen-content.mjs` and running `npm run gen`;
the generated files are committed so a clean checkout runs without a build step first.

`PLAN.md` is the spec these files implement.

## Saves

Everything lives in `localStorage` under `zero10x.save.v3`. Settings → **Copy save** gives you
a base64 blob; **Load save** takes it back. Saves from the older single-file version are
detected, wiped of their skills and refunded their KP, since the skill system changed shape.
