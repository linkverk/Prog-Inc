/**
 * What the player has discovered.
 *
 * A pure function of state, like `unlocks.ts`, and for the same reason: nothing is written
 * to the save, so a node can never be un-discovered, an imported save shows exactly what it
 * has earned, and there is no third place for the truth to live.
 *
 * The rule is one step of look-ahead. You always see what you can buy, and you always see
 * what buying it would open — but no further. That is what makes a purchase feel like it
 * reveals something: the ring beyond the one you just lit up was genuinely dark.
 */

import type { Skill } from "./types";
import { S } from "./engine";

/** Owned at all — for a gateway that means opened, for a tool that means at least one. */
const has = (id: string) => (S.skills[id] ?? 0) > 0;

/**
 * A skill is discovered when it is owned, when every prerequisite is owned (so it is on
 * the shelf, whether or not the level requirement is met yet), or when it is a root.
 *
 * Note the deliberate looseness at the second rung: a tier-7 capstone wants its four
 * prerequisites at level 3, but it becomes *visible* as soon as you own them at all. The
 * goal shows up early; only the price of reaching it stays honest.
 */
export function skillDiscovered(sk: Skill): boolean {
  if (has(sk.id)) return true;
  if (sk.req.length === 0) return true;
  return sk.req.every(has);
}

/** A shop upgrade hides behind whatever gates it: a branch, a tool count, a track. */
export function upgradeDiscovered(reqBranch?: string, reqTrack?: string, reqGen?: string): boolean {
  if (reqBranch && !has("b_" + reqBranch)) return false;
  if (reqTrack && S.track !== reqTrack) return false;
  if (reqGen && (S.gens[reqGen] ?? 0) <= 0) return false;
  return true;
}
