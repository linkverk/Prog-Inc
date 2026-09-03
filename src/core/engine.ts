import type { BranchId, GameState, Skill } from "./types";
import { GENERATORS, GROWTH, MACHINE_IDS } from "../data/generators";
import { RANKS } from "../data/ranks";
import { BRANCH_IDS } from "../data/branches";
import { SKILLS } from "../data/skills.generated";
import { UPGRADES } from "../data/upgrades.generated";
import { TRACK_BY_ID } from "../data/tracks";
import { ACHIEVEMENTS } from "../data/achievements";
import { applyFx, effectOf, newAcc, type Acc } from "./effects";
import { newGame } from "./state";

export const SKILL_BY_ID: Record<string, Skill> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

/** What one award is worth to all output, forever. The catalogue doubled, so this halved. */
export const AWARD_BONUS = 0.006;

export interface Derived {
  lps: number;
  rawLps: number;
  mps: number;
  kps: number;
  click: number;
  locValue: number;
  kpRate: number;
  genRate: Record<string, number>;
  genCost: Record<string, number>;
  costMult: number;
  bugRate: number;
  bugTol: number;
  sev: number;
  penalty: number;
  clean: number;
  debug: number;
  offEff: number;
  offCap: number;
  luck: number;
  all: number;
  moneyM: number;
  curMult: Record<BranchId, number>;
  curRate: Record<BranchId, number>;
  /* specialisation readouts */
  hypeCap: number;
  hypeDecay: number;
  hypeMult: number;
  release: number;
  relPay: number;
  bounty: number;
  bountyValue: number;
  kexp: number;
  kexpMult: number;
  passBonus: number;
  passMult: number;
  budgetMult: number;
  at25: number;
  repMult: number;
}

const zeroBranch = () => Object.fromEntries(BRANCH_IDS.map((b) => [b, 0])) as Record<BranchId, number>;
const oneBranch = () => Object.fromEntries(BRANCH_IDS.map((b) => [b, 1])) as Record<BranchId, number>;

export const newDerived = (): Derived => ({
  lps: 0, rawLps: 0, mps: 0, kps: 0, click: 1, locValue: 0.4, kpRate: 0.006,
  genRate: {}, genCost: {}, costMult: 1,
  bugRate: 0.06, bugTol: 60, sev: 0.5, penalty: 1, clean: 0, debug: 15,
  offEff: 0.5, offCap: 2, luck: 1, all: 1, moneyM: 1,
  curMult: oneBranch(), curRate: zeroBranch(),
  hypeCap: 100, hypeDecay: 1, hypeMult: 1, release: 1, relPay: 0,
  bounty: 1, bountyValue: 0, kexp: 0, kexpMult: 1,
  passBonus: 0, passMult: 1, budgetMult: 1, at25: 0, repMult: 1,
});

/** The live numbers. `derive` can fill any other `Derived`, which is what previews use. */
export const D: Derived = newDerived();

export let S: GameState = newGame();
export function setState(next: GameState): void {
  S = next;
}

export const trackOf = (s: GameState) => (s.track ? TRACK_BY_ID[s.track] : null);
export const branchOpenIn = (s: GameState, b: BranchId) => !!s.skills["b_" + b];
export const perkOf = (s: GameState, id: string) => s.perks[id] ?? 0;
export const masteryOf = (s: GameState, id: string) =>
  s.mastery[id as keyof typeof s.mastery] ?? 0;

export const track = () => trackOf(S);
export const branchOpen = (b: BranchId) => branchOpenIn(S, b);
export const skillLevel = (id: string) => S.skills[id] ?? 0;
export const perk = (id: string) => perkOf(S, id);
export const mastery = (id: string) => masteryOf(S, id);

export function rankName(i: number): string {
  const t = track();
  if (t && i >= 3) return t.ladder[i - 3] ?? RANKS[i].name;
  return RANKS[i].name;
}

/** All prerequisites owned? */
export function skillUnlocked(s: Skill): boolean {
  const need = s.reqLevel ?? 1;
  return s.req.every((r) => (S.skills[r] ?? 0) >= need);
}

export function upgradeUnlocked(u: (typeof UPGRADES)[number]): boolean {
  if (u.reqRank !== undefined && S.rank < u.reqRank) return false;
  if (u.reqClicks !== undefined && S.clicks < u.reqClicks) return false;
  if (u.reqBugsKilled !== undefined && S.bugsKilled < u.reqBugsKilled) return false;
  if (u.reqGen && (S.gens[u.reqGen[0]] ?? 0) < u.reqGen[1]) return false;
  if (u.reqBranch && !branchOpen(u.reqBranch)) return false;
  if (u.reqTrack && S.track !== u.reqTrack) return false;
  return true;
}

/**
 * Fold every modifier a state carries into a `Derived`.
 *
 * Pure in the only way that matters: it reads `s`, writes `d`, and touches no module
 * singleton. `recompute()` runs it over the live state; `core/preview.ts` runs it over
 * a copy holding one extra purchase, which is how the tree can promise a number before
 * anything is spent.
 */
export function derive(s: GameState, d: Derived): void {
  const acc: Acc = newAcc(GENERATORS.map((g) => g.id));
  let rankBase = 1.14;

  const t = trackOf(s);
  if (t) {
    applyFx(acc, t.fx);
    if (t.sig === "kernel") rankBase = 1.32;
    if (t.sig === "passes") acc.pass += 0.03;
    if (t.sig === "scaling") acc.kexp += 0.4;
  }

  for (const u of UPGRADES) if (s.upg[u.id]) applyFx(acc, u.fx);
  for (const [id, lvl] of Object.entries(s.skills)) {
    const sk = SKILL_BY_ID[id];
    if (sk && lvl > 0) applyFx(acc, effectOf(sk, lvl));
  }

  /* perks */
  acc.click *= 2.5 ** perkOf(s, "muscle");
  acc.money *= 1.35 ** perkOf(s, "clout");
  acc.bugRate *= 0.85 ** perkOf(s, "types");
  acc.kp *= 1.4 ** perkOf(s, "mentor");
  acc.offCap += 3 * perkOf(s, "sleep");
  acc.offEff += 0.15 * perkOf(s, "sleep");
  const curiosity = 1.25 ** perkOf(s, "curious");
  for (const b of BRANCH_IDS) acc.cur[b] *= curiosity;

  /* mastery: deep in your own track, lighter everywhere */
  const totalMastery = Object.values(s.mastery).reduce((a, b) => a + (b ?? 0), 0);
  acc.all *= 1 + 0.03 * totalMastery * (1 + 0.2 * perkOf(s, "transfer"));
  if (s.track) acc.all *= 1 + 0.3 * masteryOf(s, s.track);

  /* awards, rank, reputation */
  acc.all *= 1 + AWARD_BONUS * Object.keys(s.ach).length;
  acc.all *= rankBase ** s.rank;
  acc.money *= 1.7 ** s.rank;
  const starWorth = 0.05 * (1 + 0.4 * perkOf(s, "compound"));
  acc.all *= 1 + s.repLife * starWorth;
  acc.money *= 1 + s.repLife * starWorth * 0.6;

  /* specialisation scaling */
  d.hypeCap = acc.hypeCap;
  d.hypeDecay = acc.hypeDecay;
  d.release = acc.release;
  d.bounty = acc.bounty;
  d.hypeMult = 1;
  if (t?.sig === "hype") {
    d.hypeMult = 1 + 9 * Math.min(1, Math.max(0, s.hype / acc.hypeCap));
    acc.all *= d.hypeMult;
  }
  d.kexp = acc.kexp;
  d.kexpMult = acc.kexp > 0 ? 1 + acc.kexp * Math.log10(1 + Math.max(0, s.kp)) : 1;
  acc.all *= d.kexpMult;

  d.passBonus = acc.pass;
  d.passMult = acc.pass > 0 ? (1 + acc.pass) ** Object.keys(s.upg).length : 1;
  acc.all *= d.passMult;

  d.at25 = 0;
  d.budgetMult = 1;
  if (t?.sig === "budget") {
    for (const g of GENERATORS) if ((s.gens[g.id] ?? 0) >= 25) d.at25++;
    d.budgetMult = 1 + 0.05 * d.at25;
    acc.all *= d.budgetMult;
  }

  /* buffs */
  const now = Date.now();
  for (const b of s.buffs) {
    if (b.until <= now) continue;
    if (b.kind === "money") acc.money *= b.mult;
    else acc.all *= b.mult;
  }

  /* generators */
  let raw = 0;
  d.costMult = acc.costMult;
  for (const g of GENERATORS) {
    const owned = s.gens[g.id] ?? 0;
    const rate = g.rate * acc.genMult[g.id];
    d.genRate[g.id] = rate;
    d.genCost[g.id] = g.cost * acc.costMult * GROWTH ** owned;
    raw += owned * rate;
    if (g.clean) acc.clean += g.clean * Math.min(owned, 200);
  }
  raw *= acc.all;

  d.bugRate = 0.06 * acc.bugRate;
  d.clean = acc.clean;
  d.sev = 0.5 * acc.sev;
  d.bugTol = 60 + raw * 9;
  d.penalty = d.sev <= 0 ? 1 : 1 - d.sev * (s.bugs / (s.bugs + d.bugTol));

  d.rawLps = raw;
  d.lps = raw * d.penalty;
  d.all = acc.all;
  d.moneyM = acc.money;
  d.click = 1 * acc.click * acc.all + acc.clickPct * d.lps;
  d.locValue = 0.4 * acc.money;
  d.kpRate = 0.006 * acc.kp;
  d.mps = d.lps * d.locValue;
  d.kps = d.lps * d.kpRate;
  d.debug = Math.max(15, d.lps * 4) * acc.debug;
  d.offEff = Math.min(1, acc.offEff);
  d.offCap = acc.offCap;
  d.luck = acc.luck;
  d.repMult = acc.rep;
  d.bountyValue = d.locValue * 140 * acc.bounty;
  d.relPay = s.relLoc * d.locValue * 1.5 * acc.release;
  d.curMult = acc.cur;

  /* branch currency rates (per second; event-driven faucets are added on the event) */
  const machines = MACHINE_IDS.reduce((a, id) => a + (s.gens[id] ?? 0), 0);
  const oss = s.gens.oss ?? 0;
  const rates = zeroBranch();
  rates.systems = 0.08 * Math.sqrt(1 + machines);
  rates.craft = 0.6 * Math.log10(1 + d.rawLps * d.clean);
  rates.business = 0.5 * Math.log10(1 + d.mps);
  rates.data = 0.5 * Math.log10(1 + d.lps);
  rates.security = 0.6 * Math.log10(1 + d.rawLps * d.bugRate);
  rates.community = 0.4 * Math.log10(1 + oss);
  for (const b of BRANCH_IDS) {
    rates[b] = branchOpenIn(s, b) ? rates[b] * d.curMult[b] : 0;
  }
  d.curRate = rates;
}

/** Fold the live state into the live `Derived`. */
export function recompute(): void {
  derive(S, D);
}

/* ---------------------------------------------------------------- *
 *  Faucets
 * ---------------------------------------------------------------- */

export function gainCur(b: BranchId, amount: number): void {
  if (amount <= 0 || !branchOpen(b)) return;
  const v = amount * D.curMult[b];
  S.cur[b] += v;
  S.curLife[b] += v;
}

/** Algorithms pays per line typed by hand, scaled a little by how big the project is. */
export function faucetOnClick(): void {
  gainCur("algorithms", 1 + Math.log10(1 + D.lps));
}
/** Craft pays for closing bugs. */
export function faucetOnSquash(closed: number): void {
  gainCur("craft", 3 * Math.log10(1 + closed));
}
/** Security pays for bugs existing at all. */
export function faucetOnBugsAppear(count: number): void {
  gainCur("security", 0.5 * Math.log10(1 + count));
}
/** Community pays for people-shaped events. */
export function faucetOnOpportunity(): void {
  gainCur("community", 30);
}
export function faucetOnPromotion(): void {
  gainCur("community", 80);
}
/** Research pays you for committing knowledge, not hoarding it. */
export function faucetOnKpSpent(kp: number): void {
  gainCur("research", 0.06 * kp);
}

/* ---------------------------------------------------------------- *
 *  Tick
 * ---------------------------------------------------------------- */

export function gainLoc(n: number): void {
  S.loc += n;
  S.runLoc += n;
  S.totalLoc += n;
  S.relLoc += n;
  S.money += n * D.locValue;
  S.kp += n * D.kpRate;
}

export interface TickResult {
  promotions: number[];
  awards: string[];
  released: number;
}

export function tick(dt: number): TickResult {
  recompute();
  gainLoc(D.lps * dt);

  const appearing = D.rawLps * D.bugRate * dt;
  const cleaned = Math.min(S.bugs + appearing, D.rawLps * D.clean * dt);
  S.bugs += appearing - cleaned;
  if (S.bugs < 0) S.bugs = 0;
  S.bugsSeen += appearing;
  S.bugsKilled += cleaned;

  for (const b of BRANCH_IDS) gainCur(b, (D.curRate[b] / (D.curMult[b] || 1)) * dt);

  let released = 0;
  const t = track();
  if (t?.sig === "hype") {
    S.hype = Math.max(0, S.hype - 1.6 * D.hypeDecay * dt);
  } else if (t?.sig === "release") {
    S.relT += dt;
    if (S.relT >= 45) {
      recompute();
      released = D.relPay;
      S.money += released;
      S.relT = 0;
      S.relLoc = 0;
    }
  }

  const now = Date.now();
  S.buffs = S.buffs.filter((b) => b.until > now);

  return { promotions: checkRank(), awards: checkAwards(), released };
}

export function checkRank(): number[] {
  const gained: number[] = [];
  while (S.rank < RANKS.length - 1 && S.runLoc >= RANKS[S.rank + 1].req) {
    S.rank++;
    S.kp += Math.max(2, 2.4 ** S.rank);
    faucetOnPromotion();
    gained.push(S.rank);
  }
  if (gained.length) recompute();
  return gained;
}

export function checkAwards(): string[] {
  const got: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!S.ach[a.id] && a.test(S)) {
      S.ach[a.id] = 1;
      got.push(a.name);
    }
  }
  if (got.length) recompute();
  return got;
}

/* ---------------------------------------------------------------- *
 *  Purchasing maths
 * ---------------------------------------------------------------- */

export function bulkCount(genId: string, bulk: number | "max" = S.bulk): number {
  const g = GENERATORS.find((x) => x.id === genId)!;
  const owned = S.gens[genId] ?? 0;
  const base = g.cost * D.costMult * GROWTH ** owned;
  if (bulk === "max") {
    if (S.money < base) return 0;
    return Math.max(0, Math.floor(Math.log(1 + (S.money * (GROWTH - 1)) / base) / Math.log(GROWTH)));
  }
  return bulk;
}

export function bulkCost(genId: string, k: number): number {
  const g = GENERATORS.find((x) => x.id === genId)!;
  const owned = S.gens[genId] ?? 0;
  const base = g.cost * D.costMult * GROWTH ** owned;
  return (base * (GROWTH ** k - 1)) / (GROWTH - 1);
}

export function repGain(): number {
  if (S.runLoc < 2e7) return 0;
  return Math.floor((S.runLoc / 2e7) ** 0.45 * 2 * D.repMult);
}

export function masteryGain(): number {
  if (!S.track || S.rank < 3) return 0;
  return 1 + Math.floor(S.rank / 6);
}
