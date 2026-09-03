import type { BranchId, Skill } from "../core/types";
import { D, S, SKILL_BY_ID, branchOpen, skillUnlocked } from "../core/engine";
import { SKILLS } from "../data/skills.generated";
import { BRANCHES, BRANCH_BY_ID, BRANCH_IDS } from "../data/branches";
import { skillCost } from "../core/effects";
import { buySkill, buySkillBulk } from "../core/actions";
import { fmt } from "../core/format";
import { $, delegate, esc } from "./dom";
import { buildTree, fitZoom, paintTree, setZoom, type TreeView } from "./tree";

type Selection = BranchId | "global";

let selected: Selection = "global";
let picked: string | null = null;
let view: TreeView | null = null;
let builtFor = "";
let fitted = false;
let onChange: () => void = () => {};

const byBranch = new Map<Selection, Skill[]>();
for (const s of SKILLS) {
  const key = s.branch as Selection;
  if (!byBranch.has(key)) byBranch.set(key, []);
  byBranch.get(key)!.push(s);
}

const chips = new Map<Selection, HTMLElement>();

/**
 * One row of ids per tier. Foundation is the map of the whole game — the four global
 * gateways plus the eight branch gateways they open. A branch is its own trunk:
 * gateway, tier, sub-gateway, tier, and the capstones at the bottom.
 */
function rowsFor(sel: Selection): string[][] {
  if (sel === "global") {
    return [["g0"], BRANCH_IDS.map((b) => `b_${b}`), ["g1", "g2", "g3"]];
  }
  const mine = byBranch.get(sel) ?? [];
  const gates = mine.filter((s) => s.gateway).map((s) => s.id);
  const tier = (t: number) => mine.filter((s) => s.tier === t).map((s) => s.id);
  return [
    [gates[0]], tier(1), [gates[1]], tier(2),
    [gates[2]], tier(3), [gates[3]], tier(4), tier(5),
  ];
}

export function initBranches(changed: () => void): void {
  onChange = changed;

  delegate($("branchlist"), "[data-branch]", (t) => {
    select(t.dataset.branch as Selection);
  });

  delegate($("treecanvas"), "[data-node]", (t) => {
    const id = t.dataset.node!;
    // on the map, a branch gateway is also the door into that branch
    if (selected === "global" && id.startsWith("b_")) {
      select(id.slice(2) as Selection, id);
      return;
    }
    picked = id;
    renderBranches();
  });

  delegate($("treedetail"), "[data-buy]", (t) => {
    const sk = SKILL_BY_ID[t.dataset.buy!];
    if (!sk) return;
    const n = Number(t.dataset.n ?? "1");
    const bought = n === 1 ? (buySkill(sk) === "ok" ? 1 : 0) : buySkillBulk(sk, n);
    if (bought > 0) {
      renderBranches();
      onChange();
    }
  });

  $("zoom-in").addEventListener("click", () => nudgeZoom(0.15));
  $("zoom-out").addEventListener("click", () => nudgeZoom(-0.15));
  $("zoom-fit").addEventListener("click", () => {
    if (view) fitZoom(view, $("treecanvas"));
    paintZoom();
  });

  $("branch-hint").innerHTML =
    "Eight branches, eight currencies, eight different ways to earn them. " +
    "<b>Gateways open a path and are bought once — they can never be upgraded.</b> " +
    "Everything else levels up. Pick a node to see what it does.";

  buildChips();
}

function select(sel: Selection, node?: string): void {
  selected = sel;
  picked = node ?? null;
  renderBranches();
}

function nudgeZoom(by: number): void {
  if (view) setZoom(view, view.zoom + by);
  paintZoom();
}

function paintZoom(): void {
  $("zoom-val").textContent = view ? `${Math.round(view.zoom * 100)}%` : "";
}

/** How many more levels the current balance can pay for. */
function affordableLevels(sk: Skill, owned: number, cap: number): number {
  const balance = sk.currency === "kp" ? S.kp : S.cur[sk.currency];
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

export function renderBranches(): void {
  paintChips();
  renderHead();
  ensureTree();
  // the pane is hidden at boot, so the canvas has no width to fit against until it opens
  if (view && !fitted && $("treecanvas").clientWidth > 0) {
    fitZoom(view, $("treecanvas"));
    fitted = true;
    paintZoom();
  }
  if (view) {
    paintTree(view, {
      selected: picked,
      labelOf: selected === "global" ? mapLabel : undefined,
    });
  }
  renderDetail();
}

/* ---------------------------------------------------------------- *
 *  Branch list
 * ---------------------------------------------------------------- */

function buildChips(): void {
  const host = $("branchlist");
  host.innerHTML = "";
  const add = (id: Selection, name: string, sym: string) => {
    const b = document.createElement("button");
    b.className = "bchip";
    b.dataset.branch = id;
    b.innerHTML =
      `<span class="bn">${esc(name)} <span class="bsym">${sym}</span></span>` +
      `<span class="bbal"></span><span class="brate"></span>`;
    host.appendChild(b);
    chips.set(id, b);
  };
  add("global", "Foundation", "KP");
  for (const b of BRANCHES) add(b.id, b.name, b.sym);
}

function paintChips(): void {
  const foundation = chips.get("global");
  if (foundation) {
    foundation.setAttribute("aria-pressed", String(selected === "global"));
    const owned = (byBranch.get("global") ?? []).filter((s) => S.skills[s.id]).length;
    text(foundation, ".bbal", `${fmt(S.kp)} knowledge`);
    text(foundation, ".brate", `${owned}/4 gateways · +${fmt(D.kps)}/s`);
  }

  for (const b of BRANCHES) {
    const chip = chips.get(b.id);
    if (!chip) continue;
    const open = branchOpen(b.id);
    const all = byBranch.get(b.id) ?? [];
    const owned = all.filter((s) => S.skills[s.id]).length;
    chip.className = "bchip" + (open ? "" : " shut");
    chip.setAttribute("aria-pressed", String(selected === b.id));
    text(chip, ".bbal", open ? `${fmt(S.cur[b.id])} ${b.curName}` : `locked · ${fmt(b.gateCost)} KP`);
    text(chip, ".brate", open ? `+${fmt(D.curRate[b.id])}/s · ${owned}/${all.length} skills` : "");
  }
}

function text(host: HTMLElement, sel: string, s: string): void {
  const e = host.querySelector(sel) as HTMLElement | null;
  if (e) e.textContent = s;
}

/* ---------------------------------------------------------------- *
 *  Canvas
 * ---------------------------------------------------------------- */

/** On the map a branch node reports how much of that branch you own. */
function mapLabel(sk: Skill, level: number): string {
  if (sk.branch === "global") return level > 0 ? "open" : "one-time";
  if (level <= 0) return "locked";
  const all = byBranch.get(sk.branch as Selection) ?? [];
  return `${all.filter((s) => S.skills[s.id]).length}/${all.length}`;
}

function ensureTree(): void {
  if (builtFor === selected && view) return;
  const host = $("treecanvas");
  view = buildTree(host, rowsFor(selected));
  builtFor = selected;
  fitted = false;
  host.scrollLeft = 0;
  host.scrollTop = 0;
  paintZoom();
  if (!picked) picked = defaultPick();
}

/** Something worth looking at: the first node you could actually buy. */
function defaultPick(): string | null {
  const ids = rowsFor(selected).flat();
  for (const id of ids) {
    const sk = SKILL_BY_ID[id];
    if (!sk) continue;
    const owned = S.skills[id] ?? 0;
    if (owned >= sk.maxLevel || !skillUnlocked(sk)) continue;
    const balance = sk.currency === "kp" ? S.kp : S.cur[sk.currency as BranchId];
    if (balance >= skillCost(sk, owned)) return id;
  }
  return ids[0] ?? null;
}

function renderHead(): void {
  const host = $("branchhead");
  if (selected === "global") {
    host.innerHTML =
      `<div class="branchhead"><div><h3>Foundation</h3>` +
      `<div class="faucet">The map of the whole tree. Knowledge points open branches; ` +
      `pick a branch node to walk into it.</div></div>` +
      `<div class="bal"><b>${fmt(S.kp)}</b><span>KP · +${fmt(D.kps)}/s</span></div></div>`;
    return;
  }
  const b = BRANCH_BY_ID[selected];
  const open = branchOpen(b.id);
  host.innerHTML =
    `<div class="branchhead"><div><h3>${b.name} <span style="color:var(--accent)">${b.sym}</span></h3>` +
    `<div class="faucet">${b.blurb}<br><b>${b.curName}:</b> ${b.faucet}</div></div>` +
    `<div class="bal"><b>${open ? fmt(S.cur[b.id]) : "—"}</b>` +
    `<span>${b.curName}${open ? ` · +${fmt(D.curRate[b.id])}/s` : " · locked"}</span></div></div>`;
}

/* ---------------------------------------------------------------- *
 *  Detail panel
 * ---------------------------------------------------------------- */

const TIER_TITLES = ["Gateway", "Fundamentals", "Working Knowledge", "Depth", "Mastery", "Capstone"];

function renderDetail(): void {
  const host = $("treedetail");
  const sk = picked ? SKILL_BY_ID[picked] : undefined;
  if (!sk) {
    host.innerHTML = `<p class="hint" style="margin:0">Pick a node above.</p>`;
    return;
  }

  const owned = S.skills[sk.id] ?? 0;
  const unlocked = skillUnlocked(sk);
  const maxed = owned >= sk.maxLevel;
  const cost = skillCost(sk, owned);
  const sym = sk.currency === "kp" ? "KP" : BRANCH_BY_ID[sk.currency as BranchId].sym;
  const balance = sk.currency === "kp" ? S.kp : S.cur[sk.currency as BranchId];
  const can = unlocked && !maxed && balance >= cost;

  const need = sk.reqLevel ?? 1;
  const missing = sk.req
    .filter((r) => (S.skills[r] ?? 0) < need)
    .map((r) => (SKILL_BY_ID[r]?.name ?? r) + (need > 1 ? ` (level ${need})` : ""));

  const level = sk.gateway ? (owned ? "opened" : "not opened") : `${owned} / ${sk.maxLevel}`;

  let actions: string;
  if (maxed) {
    actions = `<span class="skc ok">${sk.gateway ? "open" : "maxed"}</span>`;
  } else {
    const ten = affordableLevels(sk, owned, 10);
    const all = affordableLevels(sk, owned, sk.maxLevel - owned);
    actions =
      `<span class="skc ${can ? "ok" : "no"}">${fmt(cost)} ${sym}</span>` +
      `<span class="buyrow">` +
      `<button data-buy="${sk.id}" data-n="1"${can ? "" : " disabled"}>${sk.gateway ? "Open" : "+1"}</button>` +
      (sk.gateway
        ? ""
        : `<button data-buy="${sk.id}" data-n="10"${ten > 1 ? "" : " disabled"}>+10</button>` +
          `<button data-buy="${sk.id}" data-n="${sk.maxLevel}"${all > 1 ? "" : " disabled"}>Max</button>`) +
      `</span>`;
  }

  host.innerHTML =
    `<div class="tdh"><span class="tdn">${esc(sk.name)}</span>` +
    `<span class="tdt">${TIER_TITLES[sk.tier] ?? ""}</span>` +
    `<span class="tdl">${level}</span></div>` +
    `<div class="tdd">${esc(sk.desc)}</div>` +
    (missing.length ? `<div class="tdreq">Needs: ${missing.map(esc).join(" + ")}</div>` : "") +
    `<div class="tdf">${actions}</div>`;
}

/** Is anything buyable right now? Drives the tab dot. */
export function anySkillAffordable(): boolean {
  for (const sk of SKILLS) {
    const owned = S.skills[sk.id] ?? 0;
    if (owned >= sk.maxLevel) continue;
    if (!skillUnlocked(sk)) continue;
    const balance = sk.currency === "kp" ? S.kp : S.cur[sk.currency as BranchId];
    if (balance >= skillCost(sk, owned)) return true;
  }
  return false;
}
