import type { BranchId, Fx, Skill } from "./types";
import { BRANCH_IDS } from "../data/branches";

/**
 * Accumulator the engine folds every `Fx` into. Multiplicative fields start at 1,
 * additive fields at 0. One code path for skills, upgrades, perks and specialisations.
 */
export interface Acc {
  all: number;
  click: number;
  clickPct: number;
  money: number;
  kp: number;
  bugRate: number;
  sev: number;
  debug: number;
  clean: number;
  luck: number;
  offEff: number;
  offCap: number;
  costMult: number;
  genMult: Record<string, number>;
  cur: Record<BranchId, number>;
  hypeCap: number;
  hypeDecay: number;
  release: number;
  bounty: number;
  pass: number;
  kexp: number;
  rep: number;
}

export function newAcc(genIds: string[]): Acc {
  return {
    all: 1, click: 1, clickPct: 0, money: 1, kp: 1,
    bugRate: 1, sev: 1, debug: 1, clean: 0, luck: 1,
    offEff: 0.5, offCap: 2, costMult: 1,
    genMult: Object.fromEntries(genIds.map((g) => [g, 1])),
    cur: Object.fromEntries(BRANCH_IDS.map((b) => [b, 1])) as Record<BranchId, number>,
    hypeCap: 100, hypeDecay: 1, release: 1, bounty: 1, pass: 0, kexp: 0, rep: 1,
  };
}

export function applyFx(acc: Acc, fx: Fx | undefined): void {
  if (!fx) return;
  if (fx.all) acc.all *= fx.all;
  if (fx.click) acc.click *= fx.click;
  if (fx.clickPct) acc.clickPct += fx.clickPct;
  if (fx.money) acc.money *= fx.money;
  if (fx.kp) acc.kp *= fx.kp;
  if (fx.bugRate) acc.bugRate *= fx.bugRate;
  if (typeof fx.sev === "number") acc.sev *= fx.sev;
  if (fx.debug) acc.debug *= fx.debug;
  if (fx.clean) acc.clean += fx.clean;
  if (fx.luck) acc.luck *= fx.luck;
  if (fx.offEff) acc.offEff = Math.max(acc.offEff, fx.offEff);
  if (fx.offCap) acc.offCap += fx.offCap;
  if (fx.costMult) acc.costMult *= fx.costMult;
  if (fx.hypeCap) acc.hypeCap += fx.hypeCap;
  if (fx.hypeDecay) acc.hypeDecay *= fx.hypeDecay;
  if (fx.release) acc.release *= fx.release;
  if (fx.bounty) acc.bounty *= fx.bounty;
  if (fx.pass) acc.pass += fx.pass;
  if (fx.kexp) acc.kexp += fx.kexp;
  if (fx.rep) acc.rep *= fx.rep;
  if (fx.gens && fx.genMult) {
    for (const g of fx.gens) if (acc.genMult[g] !== undefined) acc.genMult[g] *= fx.genMult;
  }
  if (fx.cur) {
    for (const [b, m] of Object.entries(fx.cur)) {
      if (m) acc.cur[b as BranchId] *= m;
    }
  }
}

/**
 * Turn `level` purchases of a skill into a single `Fx`.
 * Multiplicative kinds compound as (1 + power)^level; additive kinds accumulate linearly.
 * Gateways always arrive here with level 1.
 */
export function effectOf(skill: Skill, level: number): Fx {
  if (level <= 0) return {};
  const p = skill.power;
  const geo = (base: number) => Math.pow(1 + base, level);
  const geoDown = (base: number) => Math.pow(1 - base, level);

  switch (skill.kind) {
    case "output": return { all: geo(p) };
    case "clickPower": return { click: geo(p) };
    case "clickPct": return { clickPct: p * level };
    case "income": return { money: geo(p) };
    case "knowledge": return { kp: geo(p) };
    case "genGroup": return { gens: skill.gens ?? [], genMult: geo(p) };
    case "bugSlow":
      // a negative power deliberately raises the bug rate (Security branch)
      return { bugRate: p >= 0 ? geoDown(p) : geo(-p) };
    case "bugSoften": return { sev: geoDown(p) };
    case "debugPower": return { debug: geo(p) };
    case "autoClean": return { clean: p * level };
    case "cheaper": return { costMult: geoDown(p) };
    case "offline": return { offEff: Math.min(1, 0.5 + p * level), offCap: level };
    case "luck": return { luck: geo(p) };
    case "currency":
    case "crossCurrency": {
      const target = skill.target ?? (skill.branch as BranchId);
      return { cur: { [target]: geo(p) } as Partial<Record<BranchId, number>> };
    }
    default: return {};
  }
}

/** Price of the *next* level of a skill (level is how many you already own). */
export function skillCost(skill: Skill, ownedLevel: number): number {
  return Math.ceil(skill.cost * Math.pow(skill.costGrowth, ownedLevel));
}
