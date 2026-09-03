/**
 * What a node on the tree *is*.
 *
 * One vocabulary for three very different purchases — a skill level, a generator, a shop
 * upgrade — so `tree.ts` can draw them without knowing which is which and the tab can
 * offer one detail panel for all of them. Layers are the cut that makes 762 nodes
 * navigable: each is a connected region of the same graph, and a node with `jump` set is
 * the door between two of them.
 */

import type { BranchId, Skill, Upgrade } from "../core/types";
import type { NodeStatus, TreeLayout, TreeNodeSpec } from "./tree";
import { layoutColumns, layoutRows } from "./tree";
import {
  D, S, SKILL_BY_ID, UPGRADE_BY_ID, bulkCost, bulkCount, skillUnlocked, upgradeUnlocked,
} from "../core/engine";
import { skillCost } from "../core/effects";
import { buyGenerator, buySkill, buySkillBulk, buyUpgrade } from "../core/actions";
import { SKILLS } from "../data/skills.generated";
import { UPGRADES } from "../data/upgrades.generated";
import { GENERATORS, GEN_BY_ID } from "../data/generators";
import { BRANCHES, BRANCH_BY_ID, BRANCH_IDS } from "../data/branches";
import { fmt, money } from "../core/format";

export type LayerId = "setup" | "global" | BranchId | "upgrades";
/** `anchor` is context, not merchandise: a rank, a specialisation, a tap you fill by playing. */
export type NodeKind = "skill" | "gen" | "upgrade" | "anchor";

export interface NodeSpec extends TreeNodeSpec {
  kind: NodeKind;
  /** the id the game knows this by, without the layer prefix */
  key: string;
  desc: string;
  /** 0 means no ceiling — you can always buy one more generator */
  maxLevel: number;
  gateway: boolean;
  /** small caps line in the detail panel: "Gateway", "Tool", "Branch · Craft" … */
  tierLabel: string;
  /** clicking this node walks into another layer instead of selecting it */
  jump?: LayerId;
  /** anchors and hubs report their own state — the model cannot know what "2/45" means */
  live?: () => { label: string; reached: boolean; fill: number };
}

export interface Layer {
  id: LayerId;
  name: string;
  sym: string;
}

export const LAYERS: Layer[] = [
  { id: "setup", name: "Setup", sym: "$" },
  { id: "global", name: "Foundation", sym: "KP" },
  ...BRANCHES.map((b) => ({ id: b.id as LayerId, name: b.name, sym: b.sym })),
  { id: "upgrades", name: "Upgrades", sym: "$" },
];

const TIER_TITLES = ["Gateway", "Fundamentals", "Working Knowledge", "Depth", "Mastery", "Capstone"];

const FAMILY_LABELS: Record<string, string> = {
  generator: "Tool tier",
  output: "Output",
  income: "Income",
  click: "Clicking",
  quality: "Quality",
  knowledge: "Knowledge",
};

/** The five money-bought ladders, in the order they appear as lanes. */
const LADDERS = ["output", "income", "click", "quality", "knowledge"];

export function familyLabel(f: string): string {
  if (FAMILY_LABELS[f]) return FAMILY_LABELS[f];
  const [kind, id] = f.split(":");
  const name = id.charAt(0).toUpperCase() + id.slice(1);
  return kind === "branch" ? `Branch · ${name}` : `Track · ${name}`;
}

const skId = (id: string) => `sk:${id}`;
const genId = (id: string) => `gen:${id}`;
const upId = (id: string) => `up:${id}`;

/* ---------------------------------------------------------------- *
 *  Specs
 * ---------------------------------------------------------------- */

export function skillSpec(sk: Skill, jump?: LayerId): NodeSpec {
  return {
    id: skId(sk.id),
    key: sk.id,
    kind: "skill",
    name: sk.name,
    desc: sk.desc,
    req: sk.req.map(skId),
    reqLevel: sk.reqLevel ?? 1,
    flavour: sk.gateway ? "gate" : undefined,
    maxLevel: sk.maxLevel,
    gateway: !!sk.gateway,
    tierLabel: TIER_TITLES[sk.tier] ?? "",
    jump,
  };
}

export function upgradeSpec(u: Upgrade, req: string[], reqLevel = 1): NodeSpec {
  return {
    id: upId(u.id),
    key: u.id,
    kind: "upgrade",
    name: u.name,
    desc: u.desc,
    req,
    reqLevel,
    flavour: "upg",
    maxLevel: 1,
    gateway: false,
    tierLabel: familyLabel(u.family),
  };
}

export function genSpec(gid: string): NodeSpec {
  const g = GEN_BY_ID[gid];
  return {
    id: genId(gid),
    key: gid,
    kind: "gen",
    name: g.name,
    desc: g.desc,
    req: [],
    reqLevel: 1,
    flavour: "gen",
    maxLevel: 0,
    gateway: false,
    tierLabel: "Tool",
  };
}

/**
 * A rank, a specialisation or a tap you fill by playing. Nothing buys these; they exist so
 * that "needs rank 7" is a line you can follow rather than a sentence you have to trust.
 */
export function anchorSpec(key: string, name: string, desc: string, tierLabel: string): NodeSpec {
  return {
    id: `an:${key}`,
    key,
    kind: "anchor",
    name,
    desc,
    req: [],
    reqLevel: 1,
    flavour: "anchor",
    maxLevel: 1,
    gateway: false,
    tierLabel,
  };
}

/** Put a spec in the registry so `specById` and `statusOf` can find it by id. */
export function register(spec: NodeSpec): NodeSpec {
  specs.set(spec.id, spec);
  return spec;
}

/** The eight upgrade tiers of one tool, in unlock order. */
export function tiersOf(gid: string): Upgrade[] {
  return UPGRADES.filter((u) => u.family === "generator" && u.reqGen?.[0] === gid).sort(
    (a, b) => (a.reqGen?.[1] ?? 0) - (b.reqGen?.[1] ?? 0),
  );
}

function ladderOf(family: string): Upgrade[] {
  return UPGRADES.filter((u) => u.family === family).sort((a, b) => a.cost - b.cost);
}

/** Chain a list into a single lane: each entry requires the one above it. */
function chain(list: Upgrade[], head: string[] = [], headLevel = 1): NodeSpec[] {
  return list.map((u, i) =>
    upgradeSpec(u, i === 0 ? head : [upId(list[i - 1].id)], i === 0 ? headLevel : 1),
  );
}

/* ---------------------------------------------------------------- *
 *  Layers
 * ---------------------------------------------------------------- */

const byBranch = new Map<string, Skill[]>();
for (const s of SKILLS) {
  const key = s.branch as string;
  if (!byBranch.has(key)) byBranch.set(key, []);
  byBranch.get(key)!.push(s);
}

/**
 * Setup: a column per tool, its eight upgrade tiers hanging underneath.
 * The first edge carries the real threshold — ten of that tool — and the rest chain,
 * because the prices make the tiers strictly sequential anyway.
 */
function setupRows(): NodeSpec[][] {
  const rows: NodeSpec[][] = [GENERATORS.map((g) => genSpec(g.id))];
  const tiers = GENERATORS.map((g) => {
    const list = tiersOf(g.id);
    return chain(list, [genId(g.id)], list[0]?.reqGen?.[1] ?? 1);
  });
  const deepest = tiers.reduce((a, t) => Math.max(a, t.length), 0);
  for (let i = 0; i < deepest; i++) {
    rows.push(tiers.map((t) => t[i]).filter((s): s is NodeSpec => !!s));
  }
  return rows;
}

/** Foundation: the map of the whole game. A branch gateway is the door into its branch. */
function globalRows(): NodeSpec[][] {
  const at = (id: string, jump?: LayerId) => skillSpec(SKILL_BY_ID[id], jump);
  return [
    [at("g0")],
    BRANCH_IDS.map((b) => at(`b_${b}`, b)),
    [at("g1"), at("g2"), at("g3")],
  ];
}

/**
 * A branch is its own trunk: gateway, its money upgrades, then tier, sub-gateway, tier …
 * down to the capstones. The eight branch-flavoured upgrades sit directly under the
 * gateway because that is exactly what unlocks them.
 */
function branchRows(b: BranchId): NodeSpec[][] {
  const mine = byBranch.get(b) ?? [];
  const gates = mine.filter((s) => s.gateway);
  const tier = (t: number) => mine.filter((s) => s.tier === t).map((s) => skillSpec(s));
  const upgrades = ladderOf(`branch:${b}`).map((u) => upgradeSpec(u, [skId(`b_${b}`)]));
  return [
    [skillSpec(gates[0])], upgrades, tier(1),
    [skillSpec(gates[1])], tier(2),
    [skillSpec(gates[2])], tier(3),
    [skillSpec(gates[3])], tier(4), tier(5),
  ];
}

/** Upgrades: one lane per money-bought family, plus your specialisation's own six. */
function upgradeLanes(): NodeSpec[][] {
  const lanes = LADDERS.map((f) => chain(ladderOf(f)));
  if (S.track) lanes.push(chain(ladderOf(`track:${S.track}`)));
  return lanes;
}

/* ---------------------------------------------------------------- *
 *  Index and layouts
 * ---------------------------------------------------------------- */

const layouts = new Map<LayerId, TreeLayout>();
const specs = new Map<string, NodeSpec>();
const layerOf = new Map<string, LayerId>();
let builtForTrack: string | null | undefined;

function remember(layer: LayerId, layout: TreeLayout): TreeLayout {
  for (const n of layout.nodes) {
    specs.set(n.spec.id, n.spec as NodeSpec);
    layerOf.set(n.spec.id, layer);
  }
  layouts.set(layer, layout);
  return layout;
}

/**
 * Structure is static apart from the track lane, so it is built once and kept.
 *
 * Only the *layouts* are dropped when the specialisation changes. The spec registry is
 * shared with `treegraph`, which registers anchors and hubs that no layer would ever put
 * back — clearing it would make `specById` forget half the web.
 */
function ensureLayer(layer: LayerId): TreeLayout {
  if (builtForTrack !== S.track) {
    layouts.clear();
    builtForTrack = S.track;
  }
  const had = layouts.get(layer);
  if (had) return had;
  if (layer === "setup") return remember(layer, layoutRows(setupRows()));
  if (layer === "global") return remember(layer, layoutRows(globalRows()));
  if (layer === "upgrades") return remember(layer, layoutColumns(upgradeLanes()));
  return remember(layer, layoutRows(branchRows(layer)));
}

export function layerLayout(layer: LayerId): TreeLayout {
  return ensureLayer(layer);
}

/** Throw away the cached layouts — the spacing they were measured with has changed. */
export function resetLayouts(): void {
  layouts.clear();
}

export function specById(id: string): NodeSpec | undefined {
  return specs.get(id);
}

export interface Found {
  spec: NodeSpec;
  layer: LayerId;
}

/** Every node on every layer. Builds the layouts it has not built yet. */
export function allNodes(): Found[] {
  for (const l of LAYERS) ensureLayer(l.id);
  const out: Found[] = [];
  for (const [id, spec] of specs) out.push({ spec, layer: layerOf.get(id)! });
  return out;
}

/* ---------------------------------------------------------------- *
 *  Live state
 * ---------------------------------------------------------------- */

const thresholds = [10, 25, 50, 100, 175, 250, 350, 500];

export function levelOf(spec: NodeSpec): number {
  if (spec.kind === "skill") return S.skills[spec.key] ?? 0;
  if (spec.kind === "gen") return S.gens[spec.key] ?? 0;
  if (spec.kind === "anchor") return anchorReached(spec.key) ? 1 : 0;
  return S.upg[spec.key] ? 1 : 0;
}

/** Anchor keys are `rank:<i>`, `track:<id>`, `tap:clicks`, `tap:bugs`. */
function anchorReached(key: string): boolean {
  const [kind, id] = key.split(":");
  if (kind === "rank") return S.rank >= Number(id);
  if (kind === "track") return S.track === id;
  return true;
}

function anchorLabel(key: string): string {
  const [kind, id] = key.split(":");
  if (kind === "rank") {
    const i = Number(id);
    return S.rank === i ? "you are here" : S.rank > i ? "passed" : "ahead";
  }
  if (kind === "track") {
    if (S.track === id) return "chosen";
    return S.track ? "not this run" : "open";
  }
  return id === "clicks" ? `${fmt(S.clicks)} lines` : `${fmt(S.bugsKilled)} killed`;
}

/** What pays for this node, and what that pile is called. */
export function symbolOf(spec: NodeSpec): string {
  if (spec.kind === "anchor") return "";
  if (spec.kind !== "skill") return "$";
  const sk = SKILL_BY_ID[spec.key];
  return sk.currency === "kp" ? "KP" : BRANCH_BY_ID[sk.currency as BranchId].sym;
}

export function balanceOf(spec: NodeSpec): number {
  if (spec.kind === "anchor") return 0;
  if (spec.kind !== "skill") return S.money;
  const sk = SKILL_BY_ID[spec.key];
  return sk.currency === "kp" ? S.kp : S.cur[sk.currency as BranchId];
}

/** Price of the next single purchase. */
export function costOf(spec: NodeSpec): number {
  if (spec.kind === "anchor") return 0;
  if (spec.kind === "skill") return skillCost(SKILL_BY_ID[spec.key], levelOf(spec));
  if (spec.kind === "gen") return D.genCost[spec.key] ?? GEN_BY_ID[spec.key].cost;
  return UPGRADE_BY_ID[spec.key].cost;
}

export function priceLabel(spec: NodeSpec): string {
  if (spec.kind === "anchor") return "not for sale";
  return spec.kind === "skill" ? `${fmt(costOf(spec))} ${symbolOf(spec)}` : money(costOf(spec));
}

/**
 * A tool you cannot nearly afford stays dim rather than disappearing: the Setup layer is a
 * fixed grid, and hiding a column would move every other one under the player's cursor.
 */
function genVisible(gid: string): boolean {
  const idx = GENERATORS.findIndex((g) => g.id === gid);
  const owned = S.gens[gid] ?? 0;
  const prevOwned = idx <= 0 ? 1 : (S.gens[GENERATORS[idx - 1].id] ?? 0);
  return owned > 0 || idx === 0 || prevOwned > 0 || S.money >= (D.genCost[gid] ?? Infinity) * 0.35;
}

export function unlocked(spec: NodeSpec): boolean {
  if (spec.kind === "anchor") return anchorReached(spec.key);
  if (spec.kind === "skill") return skillUnlocked(SKILL_BY_ID[spec.key]);
  if (spec.kind === "gen") return genVisible(spec.key);
  return upgradeUnlocked(UPGRADE_BY_ID[spec.key]);
}

export function statusOf(node: TreeNodeSpec): NodeStatus {
  const spec = specs.get(node.id) ?? (node as NodeSpec);
  if (spec.kind === "anchor") {
    const own = spec.live?.();
    const reached = own ? own.reached : anchorReached(spec.key);
    return {
      level: reached ? 1 : 0,
      unlocked: reached,
      ready: false,
      maxed: false,
      label: own ? own.label : anchorLabel(spec.key),
      fill: own ? own.fill : reached ? 1 : 0,
    };
  }
  const level = levelOf(spec);
  const open = unlocked(spec);
  const maxed = spec.maxLevel > 0 && level >= spec.maxLevel;
  const ready = open && !maxed && balanceOf(spec) >= costOf(spec);

  if (spec.kind === "gen") {
    const next = thresholds.find((t) => t > level) ?? level;
    return {
      level, unlocked: open, ready, maxed: false,
      label: level > 0 ? `×${fmt(level)}` : money(costOf(spec)),
      fill: next > 0 ? level / next : 0,
    };
  }
  if (spec.kind === "upgrade") {
    return {
      level, unlocked: open, ready, maxed,
      label: maxed ? "owned" : money(costOf(spec)),
      fill: level,
    };
  }
  return {
    level, unlocked: open, ready, maxed,
    label: spec.gateway ? (level > 0 ? "open" : "one-time") : `${level}/${spec.maxLevel}`,
    fill: spec.gateway ? (level > 0 ? 1 : 0) : level / spec.maxLevel,
  };
}

/** Why a node is closed, in the player's terms. Empty when it is open. */
export function lockReason(spec: NodeSpec): string {
  if (spec.kind === "anchor") return unlocked(spec) ? "" : "Keep playing — this one arrives.";
  if (unlocked(spec)) return "";

  if (spec.kind === "skill") {
    const sk = SKILL_BY_ID[spec.key];
    const need = sk.reqLevel ?? 1;
    const missing = sk.req
      .filter((r) => (S.skills[r] ?? 0) < need)
      .map((r) => (SKILL_BY_ID[r]?.name ?? r) + (need > 1 ? ` (level ${need})` : ""));
    return missing.length ? `Needs ${missing.join(" + ")}.` : "";
  }

  if (spec.kind === "gen") return "Earn a little more and this appears.";

  const u = UPGRADE_BY_ID[spec.key];
  const parts: string[] = [];
  if (u.reqRank !== undefined && S.rank < u.reqRank) parts.push(`rank ${u.reqRank + 1}`);
  if (u.reqClicks !== undefined && S.clicks < u.reqClicks) parts.push(`${u.reqClicks} manual lines`);
  if (u.reqBugsKilled !== undefined && S.bugsKilled < u.reqBugsKilled) {
    parts.push(`${u.reqBugsKilled} bugs squashed`);
  }
  if (u.reqGen && (S.gens[u.reqGen[0]] ?? 0) < u.reqGen[1]) {
    parts.push(`${u.reqGen[1]}× ${GEN_BY_ID[u.reqGen[0]].name}`);
  }
  if (u.reqBranch && !S.skills["b_" + u.reqBranch]) parts.push(`the ${u.reqBranch} branch`);
  if (u.reqTrack && S.track !== u.reqTrack) parts.push(`the ${u.reqTrack} specialisation`);
  return parts.length ? `Needs ${parts.join(" + ")}.` : "";
}

/** How many more levels the current balance can pay for, capped. */
export function affordableLevels(spec: NodeSpec, cap: number): number {
  if (spec.kind === "anchor") return 0;
  if (spec.kind === "upgrade") return statusOf(spec).ready ? 1 : 0;
  if (spec.kind === "gen") return Math.min(cap, bulkCount(spec.key, "max"));

  const sk = SKILL_BY_ID[spec.key];
  const owned = levelOf(spec);
  const balance = balanceOf(spec);
  let spend = 0;
  let n = 0;
  while (n < cap && owned + n < sk.maxLevel) {
    const next = skillCost(sk, owned + n);
    if (spend + next > balance) break;
    spend += next;
    n++;
  }
  return n;
}

/** Buy up to `n` of whatever this node is. Returns how many were actually bought. */
export function buyNode(spec: NodeSpec, n: number | "max"): number {
  if (spec.kind === "anchor") return 0;
  if (spec.kind === "gen") {
    const k = bulkCount(spec.key, n);
    return k > 0 && buyGenerator(spec.key, n) === "ok" ? k : 0;
  }
  if (spec.kind === "upgrade") {
    return buyUpgrade(UPGRADE_BY_ID[spec.key]) === "ok" ? 1 : 0;
  }
  const sk = SKILL_BY_ID[spec.key];
  const limit = n === "max" ? sk.maxLevel : n;
  return limit === 1 ? (buySkill(sk) === "ok" ? 1 : 0) : buySkillBulk(sk, limit);
}

/** Total price of the next `n` purchases — what the ×10 / Max buttons are about to spend. */
export function bulkPrice(spec: NodeSpec, n: number): number {
  if (spec.kind === "gen") return bulkCost(spec.key, n);
  if (spec.kind === "upgrade") return costOf(spec);
  const sk = SKILL_BY_ID[spec.key];
  const owned = levelOf(spec);
  let sum = 0;
  for (let i = 0; i < n && owned + i < sk.maxLevel; i++) sum += skillCost(sk, owned + i);
  return sum;
}

/** Is anything at all buyable right now? Drives the tab dot. */
export function anyAffordable(): boolean {
  for (const sk of SKILLS) {
    const owned = S.skills[sk.id] ?? 0;
    if (owned >= sk.maxLevel || !skillUnlocked(sk)) continue;
    const balance = sk.currency === "kp" ? S.kp : S.cur[sk.currency as BranchId];
    if (balance >= skillCost(sk, owned)) return true;
  }
  for (const u of UPGRADES) {
    if (!S.upg[u.id] && upgradeUnlocked(u) && S.money >= u.cost) return true;
  }
  for (const g of GENERATORS) {
    if (genVisible(g.id) && S.money >= (D.genCost[g.id] ?? g.cost)) return true;
  }
  return false;
}

/** How many upgrades are owned, for the rail. */
export function upgradesOwned(): number {
  return UPGRADES.reduce((a, u) => a + (S.upg[u.id] ? 1 : 0), 0);
}

export const UPGRADE_TOTAL = UPGRADES.length;
