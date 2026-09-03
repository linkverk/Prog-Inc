import type { BranchId, Skill, TrackId, Upgrade } from "./types";
import {
  D, S, bulkCost, bulkCount, faucetOnClick, faucetOnKpSpent, faucetOnSquash,
  gainLoc, masteryGain, recompute, repGain, skillUnlocked, track, upgradeUnlocked,
} from "./engine";
import { skillCost } from "./effects";
import { prestige } from "./state";
import { BRANCH_BY_ID } from "../data/branches";
import { GEN_BY_ID } from "../data/generators";
import { fmt, money } from "./format";
import { log } from "./bus";

export type BuyResult = "ok" | "poor" | "locked" | "maxed";

/** One manual line. Returns how much was written, for the floating label. */
export function writeCode(): number {
  recompute();
  const gained = D.click;
  gainLoc(gained);
  S.clicks++;
  faucetOnClick();
  const t = track();
  if (t?.sig === "hype") S.hype = Math.min(D.hypeCap, S.hype + Math.max(2, D.hypeCap * 0.035));
  return gained;
}

/** Squash bugs, or — as a Security Researcher — sell the findings instead. */
export function debugSession(): { closed: number; paid: number } {
  recompute();
  const t = track();
  if (t?.sig === "bounty") {
    if (S.bugs < 1) return { closed: 0, paid: 0 };
    const paid = S.bugs * D.bountyValue;
    const kp = S.bugs * D.kpRate * 40;
    const closed = S.bugs;
    S.money += paid;
    S.kp += kp;
    S.bountyPaid += paid;
    S.bugsKilled += closed;
    S.bugs = 0;
    faucetOnSquash(closed);
    log(`Submitted ${fmt(closed)} findings. Bounty: ${money(paid)}.`, "good");
    return { closed, paid };
  }
  const closed = Math.min(S.bugs, D.debug);
  if (closed <= 0) return { closed: 0, paid: 0 };
  S.bugs -= closed;
  S.bugsKilled += closed;
  faucetOnSquash(closed);
  log(`Squashed ${fmt(closed)} bugs.`, "good");
  return { closed, paid: 0 };
}

export function buyGenerator(genId: string): BuyResult {
  const k = bulkCount(genId);
  if (k < 1) return "poor";
  const cost = bulkCost(genId, k);
  if (S.money < cost) return "poor";
  const was = S.gens[genId] ?? 0;
  S.money -= cost;
  S.gens[genId] = was + k;
  if (was === 0) log(`Added ${GEN_BY_ID[genId].name} to the setup.`);
  recompute();
  return "ok";
}

export function buyUpgrade(u: Upgrade): BuyResult {
  if (S.upg[u.id]) return "maxed";
  if (!upgradeUnlocked(u)) return "locked";
  if (S.money < u.cost) return "poor";
  S.money -= u.cost;
  S.upg[u.id] = 1;
  log(`Bought ${u.name}.`, "hi");
  recompute();
  return "ok";
}

/**
 * Buy one level of a skill.
 * Gateways are one purchase and can never be levelled — that is the whole point of them.
 */
export function buySkill(sk: Skill): BuyResult {
  const owned = S.skills[sk.id] ?? 0;
  if (sk.gateway && owned >= 1) return "maxed";
  if (owned >= sk.maxLevel) return "maxed";
  if (!skillUnlocked(sk)) return "locked";

  const cost = skillCost(sk, owned);
  if (sk.currency === "kp") {
    if (S.kp < cost) return "poor";
    S.kp -= cost;
    S.kpSpent += cost;
    faucetOnKpSpent(cost);
  } else {
    const b = sk.currency as BranchId;
    if (S.cur[b] < cost) return "poor";
    S.cur[b] -= cost;
  }

  S.skills[sk.id] = owned + 1;
  if (sk.gateway) {
    const opened = sk.branch !== "global" ? BRANCH_BY_ID[sk.branch as BranchId] : null;
    log(
      opened && sk.id === "b_" + sk.branch
        ? `Opened ${opened.name}. ${opened.curName} now accrues — ${opened.faucet}`
        : `Opened ${sk.name}.`,
      "hi",
    );
  } else if (owned === 0) {
    log(`Learned ${sk.name}.`, "hi");
  }
  recompute();
  return "ok";
}

/** Buy as many levels as the branch currency allows, up to `limit`. */
export function buySkillBulk(sk: Skill, limit: number): number {
  let bought = 0;
  while (bought < limit && buySkill(sk) === "ok") bought++;
  return bought;
}

export function chooseTrack(id: TrackId): void {
  S.track = id;
  S.trackDeferred = false;
  S.hype = 0;
  S.relT = 0;
  S.relLoc = 0;
  recompute();
}

export function jobHop(): boolean {
  const stars = repGain();
  if (stars < 1) return false;
  const m = masteryGain();
  const from = S.track;
  prestige(S, stars, m);
  recompute();
  log(
    `New job, new codebase. Earned ${stars} ★` +
      (from && m ? ` and +${m} ${from} mastery` : "") + ".",
    "hi",
  );
  return true;
}
