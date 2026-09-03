---
type: concept
id: progressive-reveal
updated: 2026-09-04
sources: [plan-md]
code: [src/core/unlocks.ts, src/main.ts, src/ui/router.ts, src/ui/nav.ts, src/ui/viewstore.ts, src/ui/toast.ts]
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

## Open question

The thresholds are authored defaults from the 2026-09-04 refactor, not measured. Nobody has
timed a fresh run to see whether Skills opening at 5 KP lands before or after the player
wants it. Same status as the balance targets in `PLAN.md` section 6 — see [[plan-md]].
