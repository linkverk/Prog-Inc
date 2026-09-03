import type { Branch, BranchId } from "../core/types";

/**
 * Eight branches, eight currencies, eight genuinely different faucets.
 * A branch currency does not accrue until its gateway skill is bought.
 * See PLAN.md §2 for the reasoning.
 */
export const BRANCHES: Branch[] = [
  {
    id: "algorithms",
    name: "Algorithms",
    curName: "Insight",
    sym: "◇",
    blurb: "Think before you type. Sharpens what your own hands are worth.",
    faucet: "Earned per line you type by hand. Idle output gives none.",
    gateCost: 40,
  },
  {
    id: "systems",
    name: "Systems",
    curName: "Uptime",
    sym: "∞",
    blurb: "Machines, schedulers, and things that keep running without you.",
    faucet: "Accrues every second, faster the more machines you own.",
    gateCost: 40,
  },
  {
    id: "craft",
    name: "Craft",
    curName: "Trust",
    sym: "✓",
    blurb: "Quality as a strategy. Fewer bugs, softer bites, faster cleanup.",
    faucet: "Earned for every bug closed, by hand or automatically.",
    gateCost: 90,
    rivals: ["security"],
  },
  {
    id: "business",
    name: "Business",
    curName: "Capital",
    sym: "¤",
    blurb: "Getting paid for it. Rates, leverage, and other people's budgets.",
    faucet: "A slice of every dollar you earn.",
    gateCost: 90,
  },
  {
    id: "data",
    name: "Data",
    curName: "Signal",
    sym: "∿",
    blurb: "Scale reading itself back to you. Rewards raw throughput.",
    faucet: "Accrues every second, scaled by the log of your LOC/s.",
    gateCost: 320,
  },
  {
    id: "security",
    name: "Security",
    curName: "Findings",
    sym: "⌖",
    blurb: "Every defect is inventory. The opposite bet to Craft.",
    faucet: "Earned for every bug that appears — the tap Craft is trying to close.",
    gateCost: 320,
    rivals: ["craft"],
  },
  {
    id: "community",
    name: "Community",
    curName: "Karma",
    sym: "♥",
    blurb: "Other people. Contributors, luck, and being in the room.",
    faucet: "Earned per opportunity caught, per promotion, and passively from contributors.",
    gateCost: 1400,
  },
  {
    id: "research",
    name: "Research",
    curName: "Proof",
    sym: "∴",
    blurb: "The long game. Pays you for committing knowledge, not hoarding it.",
    faucet: "Earned for every knowledge point you spend on gateways.",
    gateCost: 1400,
  },
];

export const BRANCH_IDS: BranchId[] = BRANCHES.map((b) => b.id);

export const BRANCH_BY_ID: Record<BranchId, Branch> = Object.fromEntries(
  BRANCHES.map((b) => [b.id, b]),
) as Record<BranchId, Branch>;

export function emptyBranchRecord(): Record<BranchId, number> {
  return Object.fromEntries(BRANCH_IDS.map((id) => [id, 0])) as Record<BranchId, number>;
}
