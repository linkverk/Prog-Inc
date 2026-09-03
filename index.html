import type { GameState, TrackId } from "./types";
import { emptyBranchRecord, BRANCH_IDS } from "../data/branches";
import { RANKS } from "../data/ranks";
import { GENERATORS } from "../data/generators";

export const SAVE_VERSION = 3;

export function newGame(): GameState {
  return {
    v: SAVE_VERSION,
    loc: 0, runLoc: 0, totalLoc: 0,
    money: 0, kp: 0, kpSpent: 0,
    rep: 0, repLife: 0,
    cur: emptyBranchRecord(),
    curLife: emptyBranchRecord(),
    gens: {}, upg: {}, skills: {}, ach: {}, perks: {}, mastery: {},
    track: null, trackDeferred: false,
    hype: 0, relT: 0, relLoc: 0,
    clicks: 0, bugs: 0, bugsKilled: 0, bugsSeen: 0, bountyPaid: 0,
    rank: 0, hops: 0, events: 0,
    buffs: [], bulk: 1, theme: null,
    started: Date.now(), lastSave: Date.now(),
  };
}

/** Repair a loaded save: fill gaps, drop content that no longer exists, refund removed spends. */
export function migrate(raw: Partial<GameState>): GameState {
  const s = { ...newGame(), ...raw } as GameState;

  s.gens ??= {};
  s.upg ??= {};
  s.skills ??= {};
  s.ach ??= {};
  s.perks ??= {};
  s.mastery ??= {};
  s.buffs ??= [];
  s.cur = { ...emptyBranchRecord(), ...(raw.cur ?? {}) };
  s.curLife = { ...emptyBranchRecord(), ...(raw.curLife ?? {}) };

  // saves made before branch currencies existed used a single flat skill pile
  if (!raw.v || raw.v < SAVE_VERSION) {
    s.kp = (s.kp || 0) + (s.kpSpent || 0);
    s.kpSpent = 0;
    s.skills = {};
    for (const b of BRANCH_IDS) {
      s.cur[b] = 0;
      s.curLife[b] = 0;
    }
    s.v = SAVE_VERSION;
  }

  // drop unknown generator ids so a renamed generator cannot corrupt production
  const known = new Set(GENERATORS.map((g) => g.id));
  for (const id of Object.keys(s.gens)) if (!known.has(id)) delete s.gens[id];

  s.rank = Math.max(0, Math.min(RANKS.length - 1, s.rank ?? 0));
  if (typeof s.started !== "number") s.started = Date.now();
  if (typeof s.lastSave !== "number") s.lastSave = Date.now();
  return s;
}

/**
 * Job hop. Keeps awards, stars, perks and track mastery; clears the run.
 * `Tenure` leaves a slice of each branch currency behind, `Version Control` a slice of tools.
 */
export function prestige(s: GameState, starsEarned: number, masteryEarned: number): void {
  const oldTrack = s.track;
  if (oldTrack && masteryEarned > 0) {
    s.mastery[oldTrack] = (s.mastery[oldTrack] ?? 0) + masteryEarned;
  }

  const keepTools = 0.06 * (s.perks.vcs ?? 0);
  const nextGens: Record<string, number> = {};
  if (keepTools > 0) {
    for (const g of GENERATORS) {
      const kept = Math.floor((s.gens[g.id] ?? 0) * keepTools);
      if (kept > 0) nextGens[g.id] = kept;
    }
  }

  const keepCur = 0.15 * (s.perks.tenure ?? 0);
  const nextCur = emptyBranchRecord();
  if (keepCur > 0) for (const b of BRANCH_IDS) nextCur[b] = Math.floor(s.cur[b] * keepCur);

  s.rep += starsEarned;
  s.repLife += starsEarned;
  s.hops += 1;

  s.loc = 0;
  s.runLoc = 0;
  s.money = (s.perks.sever ?? 0) > 0 ? 500 * 12 ** (s.perks.sever ?? 0) : 0;
  s.kp = 0;
  s.kpSpent = 0;
  s.cur = nextCur;
  s.gens = nextGens;
  s.upg = {};
  s.skills = {};
  s.bugs = 0;
  s.buffs = [];
  s.track = null as TrackId | null;
  s.trackDeferred = false;
  s.hype = 0;
  s.relT = 0;
  s.relLoc = 0;
  s.rank = Math.min(s.perks.resume ?? 0, RANKS.length - 1);
}
