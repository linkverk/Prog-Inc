import type { BranchId } from "../core/types";
import type { Found, LayerId, NodeSpec } from "./treemodel";
import {
  LAYERS, UPGRADE_TOTAL, affordableLevels, allNodes, anyAffordable, buyNode, layerLayout,
  levelOf, lockReason, priceLabel, specById, statusOf, unlocked, upgradesOwned,
} from "./treemodel";
import { D, S, branchOpen } from "../core/engine";
import { BRANCH_BY_ID } from "../data/branches";
import { GENERATORS } from "../data/generators";
import { fmt, money } from "../core/format";
import { $, delegate, esc } from "./dom";
import { buildTree, fitZoom, paintTree, scrollNodeIntoView, setZoom, type TreeView } from "./tree";

/** Highlight modes — the old shop filters, turned into a lens over the whole tree. */
type Mode = "all" | "avail" | "afford" | "owned";

let selected: LayerId = "setup";
let picked: string | null = null;
let view: TreeView | null = null;
let builtFor: LayerId | "" = "";
let fitted = false;
let query = "";
let mode: Mode = "all";
let results: Found[] = [];
let onChange: () => void = () => {};

const chips = new Map<LayerId, HTMLElement>();

export { anyAffordable };

export function initTree(changed: () => void): void {
  onChange = changed;

  delegate($("layerlist"), "[data-layer]", (t) => select(t.dataset.layer as LayerId));

  delegate($("treecanvas"), "[data-node]", (t) => {
    const spec = specById(t.dataset.node!);
    if (!spec) return;
    // a branch gateway is also the door into that branch
    if (spec.jump) {
      select(spec.jump, spec.id);
      return;
    }
    picked = spec.id;
    renderTree();
  });

  delegate($("treedetail"), "[data-buy]", (t) => {
    const spec = specById(t.dataset.buy!);
    if (!spec) return;
    const raw = t.dataset.n ?? "1";
    const n = raw === "max" ? "max" : Number(raw);
    if (buyNode(spec, n) > 0) {
      renderTree();
      onChange();
    }
  });

  delegate($("tree-results"), "[data-goto]", (t) => {
    const id = t.dataset.goto!;
    const found = results.find((r) => r.spec.id === id);
    if (found) select(found.layer, id, true);
  });

  $("zoom-in").addEventListener("click", () => nudgeZoom(0.15));
  $("zoom-out").addEventListener("click", () => nudgeZoom(-0.15));
  $("zoom-fit").addEventListener("click", () => {
    if (view) fitZoom(view, $("treecanvas"));
    paintZoom();
  });

  $<HTMLInputElement>("tree-q").addEventListener("input", (e) => {
    query = (e.target as HTMLInputElement).value.trim().toLowerCase();
    renderTree();
  });
  $<HTMLSelectElement>("tree-mode").addEventListener("change", (e) => {
    mode = (e.target as HTMLSelectElement).value as Mode;
    renderTree();
  });

  $("tree-hint").innerHTML =
    "Everything you can buy lives here: tools, upgrades and all eight branches, wired by " +
    "what unlocks what. <b>Gateways open a path and are bought once — they can never be " +
    "upgraded.</b> Pick a layer on the left, or search across all of them.";

  buildChips();
}

function select(layer: LayerId, node?: string, scroll = false): void {
  selected = layer;
  if (node) picked = node;
  renderTree();
  if (scroll && node && view) scrollNodeIntoView(view, $("treecanvas"), node);
}

function nudgeZoom(by: number): void {
  if (view) setZoom(view, view.zoom + by);
  paintZoom();
}

function paintZoom(): void {
  $("zoom-val").textContent = view ? `${Math.round(view.zoom * 100)}%` : "";
}

export function renderTree(): void {
  paintChips();
  renderHead();
  ensureTree();
  // the pane is hidden at boot, so the canvas has no width to fit against until it opens
  if (view && !fitted && $("treecanvas").clientWidth > 0) {
    fitZoom(view, $("treecanvas"));
    fitted = true;
    paintZoom();
  }
  const hl = renderSearch();
  if (view) paintTree(view, { selected: picked, statusOf, highlight: hl });
  renderDetail();
}

/* ---------------------------------------------------------------- *
 *  Layer rail
 * ---------------------------------------------------------------- */

function buildChips(): void {
  const host = $("layerlist");
  host.innerHTML = "";
  for (const l of LAYERS) {
    const b = document.createElement("button");
    b.className = "lchip";
    b.dataset.layer = l.id;
    b.innerHTML =
      `<span class="bn">${esc(l.name)} <span class="bsym">${l.sym}</span></span>` +
      `<span class="bbal"></span><span class="brate"></span>`;
    host.appendChild(b);
    chips.set(l.id, b);
  }
}

function paintChips(): void {
  for (const l of LAYERS) {
    const chip = chips.get(l.id);
    if (!chip) continue;
    let shut = false;
    let bal = "";
    let rate = "";

    if (l.id === "setup") {
      const tools = GENERATORS.reduce((a, g) => a + (S.gens[g.id] ?? 0), 0);
      bal = money(S.money);
      rate = `${fmt(tools)} tools · +${fmt(D.lps)} LOC/s`;
    } else if (l.id === "global") {
      const opened = ["g0", "g1", "g2", "g3"].filter((id) => S.skills[id]).length;
      bal = `${fmt(S.kp)} knowledge`;
      rate = `${opened}/4 gateways · +${fmt(D.kps)}/s`;
    } else if (l.id === "upgrades") {
      bal = money(S.money);
      rate = `${upgradesOwned()}/${UPGRADE_TOTAL} owned`;
    } else {
      const b = BRANCH_BY_ID[l.id as BranchId];
      const open = branchOpen(b.id);
      const all = layerLayout(b.id).nodes;
      const owned = all.filter((n) => levelOf(n.spec as NodeSpec) > 0).length;
      shut = !open;
      bal = open ? `${fmt(S.cur[b.id])} ${b.curName}` : `locked · ${fmt(b.gateCost)} KP`;
      rate = open ? `+${fmt(D.curRate[b.id])}/s · ${owned}/${all.length} owned` : "";
    }

    chip.className = "lchip" + (shut ? " shut" : "");
    chip.setAttribute("aria-pressed", String(selected === l.id));
    text(chip, ".bbal", bal);
    text(chip, ".brate", rate);
  }
}

function text(host: HTMLElement, sel: string, s: string): void {
  const e = host.querySelector(sel) as HTMLElement | null;
  if (e) e.textContent = s;
}

/* ---------------------------------------------------------------- *
 *  Head
 * ---------------------------------------------------------------- */

function head(title: string, blurb: string, big: string, small: string): void {
  $("layerhead").innerHTML =
    `<div class="layerhead"><div><h3>${title}</h3><div class="faucet">${blurb}</div></div>` +
    `<div class="bal"><b>${big}</b><span>${small}</span></div></div>`;
}

function renderHead(): void {
  if (selected === "setup") {
    head(
      "Setup",
      "Everything that writes code while you don't. Each purchase costs more than the last, " +
        "and every tool has eight upgrade tiers underneath it.",
      money(S.money),
      `bank · +${fmt(D.mps)}/s`,
    );
    return;
  }
  if (selected === "global") {
    head(
      "Foundation",
      "The map of the whole tree. Knowledge points open branches; pick a branch node to walk into it.",
      fmt(S.kp),
      `KP · +${fmt(D.kps)}/s`,
    );
    return;
  }
  if (selected === "upgrades") {
    head(
      "Upgrades",
      "Bought with money, lost on a job hop. One lane per family, cheapest at the top — " +
        "they unlock as your career gives you access to them.",
      `${upgradesOwned()}/${UPGRADE_TOTAL}`,
      `owned · ${money(S.money)} bank`,
    );
    return;
  }

  const b = BRANCH_BY_ID[selected as BranchId];
  const open = branchOpen(b.id);
  head(
    `${esc(b.name)} <span style="color:var(--accent)">${b.sym}</span>`,
    `${b.blurb}<br><b>${b.curName}:</b> ${b.faucet}`,
    open ? fmt(S.cur[b.id]) : "—",
    `${b.curName}${open ? ` · +${fmt(D.curRate[b.id])}/s` : " · locked"}`,
  );
}

/* ---------------------------------------------------------------- *
 *  Canvas
 * ---------------------------------------------------------------- */

function ensureTree(): void {
  if (builtFor === selected && view) return;
  const host = $("treecanvas");
  view = buildTree(host, layerLayout(selected));
  builtFor = selected;
  fitted = false;
  host.scrollLeft = 0;
  host.scrollTop = 0;
  paintZoom();
  if (!picked || !view.nodes.has(picked)) picked = defaultPick();
}

/** Something worth looking at: the first node on this layer you could actually buy. */
function defaultPick(): string | null {
  const nodes = layerLayout(selected).nodes;
  for (const n of nodes) if (statusOf(n.spec).ready) return n.spec.id;
  return nodes[0]?.spec.id ?? null;
}

/* ---------------------------------------------------------------- *
 *  Search
 * ---------------------------------------------------------------- */

function matches(spec: NodeSpec): boolean {
  if (query && !`${spec.name} ${spec.desc}`.toLowerCase().includes(query)) return false;
  const st = statusOf(spec);
  switch (mode) {
    case "owned": return st.level > 0;
    case "afford": return st.ready;
    case "avail": return unlocked(spec) && !st.maxed;
    case "all": return true;
  }
}

const layerName = (id: LayerId) => LAYERS.find((l) => l.id === id)?.name ?? id;

/** Returns the ids to highlight, or null when no lens is active. */
function renderSearch(): Set<string> | null {
  const host = $("tree-results");
  if (!query && mode === "all") {
    results = [];
    host.innerHTML = "";
    $("tree-count").textContent = "";
    return null;
  }

  results = allNodes().filter((f) => matches(f.spec));
  const here = results.filter((f) => f.layer === selected).length;
  $("tree-count").textContent =
    `${results.length} match${results.length === 1 ? "" : "es"} · ${here} on this layer`;

  host.innerHTML = query
    ? results
        .slice(0, 8)
        .map(
          (f) =>
            `<button class="tres" data-goto="${f.spec.id}">` +
            `<span class="tresl">${esc(layerName(f.layer))}</span> ${esc(f.spec.name)}</button>`,
        )
        .join("")
    : "";

  return new Set(results.map((f) => f.spec.id));
}

/* ---------------------------------------------------------------- *
 *  Detail panel
 * ---------------------------------------------------------------- */

function levelLine(spec: NodeSpec, level: number): string {
  if (spec.kind === "gen") return `×${fmt(level)}`;
  if (spec.kind === "upgrade") return level > 0 ? "owned" : "not bought";
  if (spec.gateway) return level > 0 ? "opened" : "not opened";
  return `${level} / ${spec.maxLevel}`;
}

function renderDetail(): void {
  const host = $("treedetail");
  const spec = picked ? specById(picked) : undefined;
  if (!spec) {
    host.innerHTML = `<p class="hint" style="margin:0">Pick a node above.</p>`;
    return;
  }

  const st = statusOf(spec);
  const extra =
    spec.kind === "gen"
      ? `<br>+${fmt(D.genRate[spec.key] * D.all)} LOC/s each` +
        (st.level > 0 ? ` · ${fmt(st.level * D.genRate[spec.key] * D.all)} LOC/s from these` : "")
      : "";
  const reason = lockReason(spec);

  host.innerHTML =
    `<div class="tdh"><span class="tdn">${esc(spec.name)}</span>` +
    `<span class="tdt">${esc(spec.tierLabel)}</span>` +
    `<span class="tdl">${levelLine(spec, st.level)}</span></div>` +
    `<div class="tdd">${esc(spec.desc)}${extra}</div>` +
    (reason ? `<div class="tdreq">${esc(reason)}</div>` : "") +
    `<div class="tdf">${actionsFor(spec)}</div>`;
}

function actionsFor(spec: NodeSpec): string {
  const st = statusOf(spec);
  if (st.maxed) return `<span class="skc ok">${spec.gateway ? "open" : "owned"}</span>`;

  const can = st.ready;
  const price = `<span class="skc ${can ? "ok" : "no"}">${priceLabel(spec)}</span>`;
  const btn = (n: string, label: string, on: boolean) =>
    `<button data-buy="${spec.id}" data-n="${n}"${on ? "" : " disabled"}>${label}</button>`;

  if (spec.kind === "upgrade") return price + `<span class="buyrow">${btn("1", "Buy", can)}</span>`;
  if (spec.gateway) return price + `<span class="buyrow">${btn("1", "Open", can)}</span>`;

  const cap = spec.maxLevel > 0 ? spec.maxLevel - levelOf(spec) : 1000;
  const mark = spec.kind === "gen" ? "×" : "+";
  return (
    price +
    `<span class="buyrow">` +
    btn("1", `${mark}1`, can) +
    btn("10", `${mark}10`, affordableLevels(spec, 10) > 1) +
    btn("max", "Max", affordableLevels(spec, cap) > 1) +
    `</span>`
  );
}
