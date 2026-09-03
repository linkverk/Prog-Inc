---
type: concept
id: progressive-reveal
updated: 2026-09-04
sources: [plan-md]
code: [src/core/unlocks.ts, src/core/reveal.ts, src/main.ts, src/ui/router.ts, src/ui/nav.ts, src/ui/viewstore.ts, src/ui/toast.ts, src/ui/treemodel.ts, src/ui/tree.ts]
---

# Progressive reveal

A fresh game shows one page. The other six earn their place in the sidebar one at a time,
each at the moment it first has something to do. This is the standard idle-game onboarding
curve (Cookie Clicker, Kittens Game, Antimatter Dimensions all do it) and it replaced a
first screen that showed five tabs, a 794-node map and a prestige button a new player could
not press for an hour. See [[overview]] for the page list.

## The rules

`pageUnlocked(id)` in `src/core/unlocks.ts:33` is the whole policy. Every rule is a pure
function of `S` and `D`; nothing is written to the save.

| page | opens when | provenance |
|---|---|---|
| Desk, Settings | always | `src/core/unlocks.ts:35` |
| Tools | `$` ≥ price of the first tool (10, `src/data/generators.ts:4`), or any tool owned | `src/core/unlocks.ts:38` |
| Skills | KP ≥ price of `g0` (5 KP, `src/data/skills.generated.ts`), or any skill owned, or rank ≥ 1 | `src/core/unlocks.ts:41` |
| Career | rank ≥ 1 | `src/core/unlocks.ts:44` |
| Awards | any achievement | `src/core/unlocks.ts:46` |
| Job Hop | 1M lines this run, or any hop, or any lifetime reputation | `src/core/unlocks.ts:48` |
| Stats | 1 000 lines lifetime | `src/core/unlocks.ts:51` |

Job Hop opens at 1M lines while the hop itself pays nothing under 20M (`src/core/engine.ts:366`).
That gap is deliberate: the page is a goal to look at before it is a button to press.

## Why nothing is saved

Three properties fall out of "recompute from state every second, store nothing":

- **A page can never be lost.** There is no flag to corrupt, no migration to write, and
  `zero10x.save.v3` did not need a version bump.
- **An old save opens silently.** `watchUnlocks()` in `src/main.ts:117` seeds its "known"
  set from the first computation, not from empty, so a mid-game save gets every page it has
  earned at boot and zero unlock toasts. Only a rule turning true *during* play announces
  itself: one log line, one toast, one **new** badge.
- **The thresholds are editable in one place.** Retuning the first ten minutes is a change
  to one `switch`, and the wiki table above is the only other place the numbers live.

The one piece of UI state — which pages the player has *visited*, so the **new** badge can
clear — is `seen[]` in `zero10x.view.v1` (`src/ui/viewstore.ts`), next to the tree view
state and the last page. It is not game progress, so it does not belong in the save.

## What a reveal looks like

`src/main.ts:117` diffs `unlockedPages()` against the previous set once a second. A new id
gets its line from the `REVEAL` table (`src/main.ts:103`), pushed to the commit log and to
the toast stack (`src/ui/toast.ts`), and `paintNav()` (`src/ui/nav.ts:42`) un-hides the entry
with a **new** badge. Under 860px the bottom bar shows four slots, so a reveal past the
fourth page badges **More** instead (`src/ui/nav.ts:15`, `MOBILE_SLOTS`).

The router refuses `go()` to a locked page and falls back to the Desk (`src/ui/router.ts:77`),
which also covers a stale `#/hop` hash in a fresh profile.

## The same idea inside the tree

Since 2026-09-04 the principle is applied a second time, one level down: not *which page is
open* but *which node has a name*. `src/core/reveal.ts` holds the rule, and it is short on
purpose — a node is discovered when you own it, when every prerequisite is owned, or when it
has no prerequisites at all. One step of look-ahead, no more.

That last clause is what makes it a reveal rather than a gate. You can always see what you
are able to buy, and always see what buying it would open, but never the ring after that. So
a gateway purchase does something visible beyond its own multiplier: the tier behind it
acquires names.

Measured on a fresh save (`src/core/reveal.ts`, counted over `SKILLS`):

| after | skills with a name |
|---|---|
| new game | 1 of 600 |
| buying First Principles (`g0`) | 9 |
| opening a branch gateway | 22 |
| opening that branch's first sub-path | 35 |

An undiscovered node is **veiled, not absent**: it keeps its slot in the layout and draws as
a dashed `???` with no price and no button (`NodeStatus.veiled`, `src/ui/tree.ts`; the name
is written at build time so `paintTree` overwrites it on every paint). This is the same
reasoning that keeps unaffordable generators dimmed rather than hidden — `PLAN.md` section 7 —
the canvas must never jump under the cursor. The search box also refuses to match a veiled
node (`matches()` in `src/ui/treetab.ts`), because a spoiler through the back door is still a
spoiler.

Nothing is written to the save, for the reasons in *Why nothing is saved* above. The one
piece of state is the player's own preference: an **Earned / Everything** switch stored as
`view.reveal` in `zero10x.view.v1` (`src/ui/viewstore.ts`), for players who would rather read
the whole map.

## The other half: why buy this one

Reveal answers *what comes next*; it does not answer *what is this worth*. That is
`src/core/preview.ts`, added at the same time. It forks the state, applies the purchase to
the copy, and runs the same `derive(s, out)` the live game runs — the refactor that made
`recompute()` a one-line wrapper (`src/core/engine.ts`) exists for this. The detail panel
then prints only the readouts that actually moved.

Verified 2026-09-04: across a skill bought once, a skill bought five and ten times, a tool
bought once and ten times, and a shop upgrade, the previewed `lps`/`mps`/`kps`/`click` match
the values after really buying to within 1e-9. The refactor itself was checked the same way —
all 37 fields of `Derived` identical before and after.

## Open question

The thresholds are authored defaults from the 2026-09-04 refactor, not measured. Nobody has
timed a fresh run to see whether Skills opening at 5 KP lands before or after the player
wants it. Same status as the balance targets in `PLAN.md` section 6 — see [[plan-md]].

The node-level reveal has the same status: one step of look-ahead is a judgement call, not a
measurement. Two steps would make the map feel larger and the purchases flatter; zero steps
would hide the thing you are saving for. Nobody has played a full run either way.
