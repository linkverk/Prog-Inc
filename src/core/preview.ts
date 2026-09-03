/**
 * What a purchase is actually worth, before you make it.
 *
 * The tree can print a price and a per-level sentence, but neither answers the question a
 * player is really asking: how much faster does this make me? So we take the state, add
 * the purchase to a copy of it, and run the same `derive` the live game runs. No special
 * case per effect kind, and no second implementation of the maths to drift out of step —
 * the number on the panel comes from the code that will produce it a second later.
 */

import type { GameState, Skill, Upgrade } from "./types";
import type { Derived } from "./engine";
import { D, S, derive, newDerived } from "./engine";
import { GROWTH } from "../data/generators";
import { skillCost } from "./effects";

export interface Preview {
  before: Derived;
  after: Derived;
}

/** One scratch pad, reused: a preview is computed on demand and read immediately. */
const scratch = newDerived();

/**
 * A copy deep enough to take a purchase. The record fields are the only ones a purchase
 * touches, and `buffs` is copied because `derive` reads it — everything else can be
 * shared, because nothing here writes to it.
 */
function fork(s: GameState): GameState {
  return {
    ...s,
    gens: { ...s.gens },
    upg: { ...s.upg },
    skills: { ...s.skills },
    cur: { ...s.cur },
    curLife: { ...s.curLife },
    ach: { ...s.ach },
    perks: { ...s.perks },
    mastery: { ...s.mastery },
    buffs: s.buffs.slice(),
  };
}

function run(s: GameState): Preview {
  derive(s, scratch);
  return { before: D, after: scratch };
}

/** `n` more levels of a skill. Gateways cap at one, exactly as the buy handler does. */
export function previewSkill(sk: Skill, n: number): Preview {
  const s = fork(S);
  const owned = s.skills[sk.id] ?? 0;
  s.skills[sk.id] = Math.min(sk.maxLevel, owned + Math.max(1, n));
  return run(s);
}

/** `n` more of a tool. */
export function previewGenerator(genId: string, n: number): Preview {
  const s = fork(S);
  s.gens[genId] = (s.gens[genId] ?? 0) + Math.max(1, n);
  return run(s);
}

export function previewUpgrade(u: Upgrade): Preview {
  const s = fork(S);
  s.upg[u.id] = 1;
  return run(s);
}

/** How much better, as a fraction: `0.12` means twelve per cent more. */
export function gainOf(before: number, after: number): number {
  if (!isFinite(before) || !isFinite(after)) return 0;
  if (before <= 0) return after > 0 ? Infinity : 0;
  return after / before - 1;
}

/** What the next `n` tools cost together, at today's discount. */
export function toolRunCost(base: number, owned: number, n: number): number {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += base * D.costMult * GROWTH ** (owned + i);
  return sum;
}

/** What the next `n` levels of a skill cost together. */
export function skillRunCost(sk: Skill, owned: number, n: number): number {
  let sum = 0;
  for (let i = 0; i < n && owned + i < sk.maxLevel; i++) sum += skillCost(sk, owned + i);
  return sum;
}
