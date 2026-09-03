import type { BranchId } from "../core/types";
import type { Found, LayerId, NodeSpec } from "./treemodel";
import {
  LAYERS, UPGRADE_TOTAL, affordableLevels, allNodes, anyAffordable, buyNode, layerLayout,
  levelOf, lockReason, priceLabel, resetLayouts, specById, statusOf, unlocked, upgradesOwned,
} from "./treemodel";
import {
  FAMILIES, allWebNodes, branchHubId, connectionsOf, density, edgeCount, familiesOn, hubOf,
  isOpen, mode, nodeCount, openPath, setDensityMode, setMode, shapeKey, toggleFamily,
  toggleOpen, webEdges, webRoot,
} from "./treegraph";
import { D, S, branchOpen } from "../core/engine";
import { BRANCH_BY_ID } from "../data/branches";
import { GENERATORS } from "../data/generators";
import { fmt, money } from "../core/format";
import { $, delegate, esc } from "./dom";
import {
  FIT_MIN, ZOOM_MIN, buildTree, centreView, enablePan, fitZoom, layoutRadial, paintTree,
  scrollNodeIntoView, setDensity, setZoom, type Density, type TreeView,
} from "./tree";

/** Highlight modes — the old shop filters, turned into a lens over the whole tree. */
type Lens = "all" | "avail" | "afford" | "owned";

let selected: LayerId = "setup";
let picked: string | null = null;
let view: TreeView | null = null;
let builtFor = "";
let fitted = false;
let query = "";
let lens: Lens = "all";
let results: Found[] = [];
let onChange: () => void = () => {};

const chips = new Map<LayerId, HTMLElement>();

export { anyAffordable };

/** In the web, a rail chip is a shortcut to that region's hub. */
function hubFor(layer: LayerId): string {
  if (layer === "setup") return "an:hub:setup";
  if (layer === "upgrades") return "an:hub:upgrades";
  if (layer === "global") return "sk:g0";
  return branchHubId(layer as BranchId);
}

export function initTree(changed: () => void): void {
  onChange = changed;

  delegate($("layerlist"), "[data-layer]", (t) => {
    const layer = t.dataset.layer as LayerId;
    if (mode() === "web") {
      goTo(hubFor(layer));
      return;
    }
    selected = layer;
    renderTree();
  });

  delegate($("treecanvas"), "[data-node]", (t, ev) => {
    // the chevron lives inside the node button; it folds instead of selecting
    const fold = (ev.target as HTMLElement | null)?.closest("[data-toggle]") as HTMLElement | null;
    if (fold) {
      toggleOpen(fold.dataset.toggle!);
      renderTree();
      if (view) scrollNodeIntoView(view, $("treecanvas"), fold.dataset.toggle!);
      return;
    }
    const spec = specById(t.dataset.node!);
    if (!spec) return;
    // in the flat view a branch gateway is also the door into that branch
    if (mode() === "layers" && spec.jump) {
      selected = spec.jump;
      picked = spec.id;
      renderTree();
      return;
    }
    picked = spec.id;
    renderTree();
  });

  delegate($("treedetail"), "[data-buy]", (t) => {
    const spec = specById(t.dataset.buy!);
    if (!spec) return;
    const raw = t.dataset.n ?? "1";
    const bought = buyNode(spec, raw === "max" ? "max" : Number(raw));
    if (bought > 0) {
      renderTree();
      onChange();
    }
  });

  delegate($("treedetail"), "[data-goto]", (t) => goTo(t.dataset.goto!));
  delegate($("tree-results"), "[data-goto]", (t) => goTo(t.dataset.goto!));

  delegate($("tree-fams"), "[data-fam]", (t) => {
    toggleFamily(t.dataset.fam!);
    renderTree();
  });

  delegate($("tree-mode-switch"), "[data-mode]", (t) => {
    setMode(t.dataset.mode as "web" | "layers");
    picked = null;
    renderTree();
    refit();
  });

  delegate($("tree-density"), "[data-density]", (t) => {
    setDensityMode(t.dataset.density as Density);
    // the flat layers are memoised, and they were measured with the old spacing
    resetLayouts();
    renderTree();
    refit();
  });

  $("zoom-in").addEventListener("click", () => nudgeZoom(0.15));
  $("zoom-out").addEventListener("click", () => nudgeZoom(-0.15));
  $("zoom-fit").addEventListener("click", refit);

  $<HTMLInputElement>("tree-q").addEventListener("input", (e) => {
    query = (e.target as HTMLInputElement).value.trim().toLowerCase();
    renderTree();
  });
  $<HTMLSelectElement>("tree-mode").addEventListener("change", (e) => {
    lens = (e.target as HTMLSelectElement).value as Lens;
    renderTree();
  });

  enablePan($("treecanvas"));
  // the layouts are pure functions of the metrics, so this has to land before the first build
  setDensity(density());

  $("tree-hint").innerHTML =
    `Every purchase in the game — ${nodeCount()} nodes — is one map, wired by what unlocks ` +
    "what. <b>Gateways open a path and are bought once; they can never be upgraded.</b> " +
    "Fold a branch with its chevron, switch edge families on below, or search every corner at once.";

  buildChips();
}

/** Open the folds above a node, select it, and put it under the player's eyes. */
function goTo(id: string): void {
  const spec = specById(id);
  if (!spec) return;
  picked = id;
  if (mode() === "web") openPath(id);
  else if (spec.jump) selected = spec.jump;
  renderTree();
  if (view?.nodes.has(id)) scrollNodeIntoView(view, $("treecanvas"), id);
}

function nudgeZoom(by: number): void {
  if (view) setZoom(view, view.zoom + by);
  paintZoom();
}

function refit(): void {
  if (!view) return;
  fitZoom(view, $("treecanvas"), mode() === "web" ? ZOOM_MIN : FIT_MIN);
  // the web grows outwards from the middle, so fitting it means looking at the middle
  if (mode() === "web") centreView(view, $("treecanvas"));
  paintZoom();
}

function paintZoom(): void {
  $("zoom-val").textContent = view ? `${Math.round(view.zoom * 100)}%` : "";
  // far enough out that names are noise: keep the shape, drop the words
  $("treecanvas").classList.toggle("z-far", !!view && view.zoom < 0.55);
}

export function renderTree(): void {
  const web = mode() === "web";
  document.querySelectorAll<HTMLElement>("#tree-mode-switch [data-mode]").forEach((b) => {
    b.setAttribute("aria-pressed", String((b.dataset.mode === "web") === web));
  });
  document.querySelectorAll<HTMLElement>("#tree-density [data-density]").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.density === density()));
  });
  $("tree-fams").hidden = !web;
  // the map wants room; a flat layer is happier short, next to its detail panel
  $("treecanvas").classList.toggle("web", web);

  paintChips();
  renderHead();
  ensureTree();
  // the pane is hidden at boot, so the canvas has no width to fit against until it opens
  if (view && !fitted && $("treecanvas").clientWidth > 0) {
    refit();
    fitted = true;
  }
  renderFamilies();
  const hl = renderSearch();
  if (view) {
    paintTree(view, {
      selected: picked,
      statusOf,
      highlight: hl,
      families: web ? familiesOn() : null,
    });
  }
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
  const web = mode() === "web";
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
      const have = all.filter((n) => levelOf(n.spec as NodeSpec) > 0).length;
      shut = !open;
      bal = open ? `${fmt(S.cur[b.id])} ${b.curName}` : `locked · ${fmt(b.gateCost)} KP`;
      rate = open ? `+${fmt(D.curRate[b.id])}/s · ${have}/${all.length} owned` : "";
    }

    const here = web ? isOpen(hubFor(l.id)) : selected === l.id;
    chip.className = "lchip" + (shut ? " shut" : "");
    chip.setAttribute("aria-pressed", String(here));
    text(chip, ".bbal", bal);
    text(chip, ".brate", rate);
  }
}

function text(host: HTMLElement, sel: string, s: string): void {
  const e = host.querySelector(sel) as HTMLElement | null;
  if (e) e.textContent = s;
}

/* ---------------------------------------------------------------- *
 *  Head and legend
 * ---------------------------------------------------------------- */

function head(title: string, blurb: string, big: string, small: string): void {
  $("layerhead").innerHTML =
    `<div class="layerhead"><div><h3>${title}</h3><div class="faucet">${blurb}</div></div>` +
    `<div class="bal"><b>${big}</b><span>${small}</span></div></div>`;
}

function renderHead(): void {
  if (mode() === "web") {
    head(
      "The map",
      "You are the middle of it. Tools, upgrades, your career and the eight branches fan out " +
        "around you; anything that is not a parent link arcs across the centre.",
      `${fmt(D.lps)}`,
      "LOC/s at the centre",
    );
    return;
  }
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

function renderFamilies(): void {
  if (mode() !== "web") return;
  const on = familiesOn();
  $("tree-fams").innerHTML = FAMILIES.map(
    (f) =>
      `<button class="fam ${f.id}" data-fam="${f.id}" aria-pressed="${on.has(f.id)}">` +
      `<i></i>${esc(f.name)} <b>${edgeCount(f.id)}</b></button>`,
  ).join("");
}

/* ---------------------------------------------------------------- *
 *  Canvas
 * ---------------------------------------------------------------- */

function ensureTree(): void {
  // the density is part of the shape: changing it has to rebuild, not just repaint
  const key =
    mode() === "web" ? `web:${density()}:${shapeKey()}` : `layers:${density()}:${selected}`;
  if (builtFor === key && view) return;
  const host = $("treecanvas");
  const keepLeft = host.scrollLeft;
  const keepTop = host.scrollTop;
  const sameMode = builtFor.startsWith(mode());

  view = buildTree(
    host,
    mode() === "web" ? layoutRadial(webRoot(), webEdges()) : layerLayout(selected),
  );
  builtFor = key;
  fitted = false;
  // folding one branch should not throw the player back to the corner of the map
  if (sameMode) {
    host.scrollLeft = keepLeft;
    host.scrollTop = keepTop;
  } else if (mode() === "web") {
    centreView(view, host);
  } else {
    host.scrollLeft = 0;
    host.scrollTop = 0;
  }
  paintZoom();
  if (!picked || !view.nodes.has(picked)) picked = defaultPick();
}

/** Something worth looking at: the first node here you could actually buy. */
function defaultPick(): string | null {
  const nodes = view?.layout.nodes ?? [];
  for (const n of nodes) if (statusOf(n.spec).ready) return n.spec.id;
  return nodes[0]?.spec.id ?? null;
}

/* ---------------------------------------------------------------- *
 *  Search
 * ---------------------------------------------------------------- */

function matches(spec: NodeSpec): boolean {
  if (query && !`${spec.name} ${spec.desc}`.toLowerCase().includes(query)) return false;
  const st = statusOf(spec);
  switch (lens) {
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
  if (!query && lens === "all") {
    results = [];
    host.innerHTML = "";
    $("tree-count").textContent = "";
    return null;
  }

  const web = mode() === "web";
  results = web
    ? allWebNodes().filter(matches).map((spec) => ({ spec, layer: "global" as LayerId }))
    : allNodes().filter((f) => matches(f.spec));

  const here = web
    ? results.filter((f) => view?.nodes.has(f.spec.id)).length
    : results.filter((f) => f.layer === selected).length;
  $("tree-count").textContent =
    `${results.length} match${results.length === 1 ? "" : "es"} · ${here} ${web ? "on screen" : "on this layer"}`;

  host.innerHTML = query
    ? results
        .slice(0, 8)
        .map(
          (f) =>
            `<button class="tres" data-goto="${f.spec.id}">` +
            `<span class="tresl">${esc(web ? hubOf(f.spec.id) : layerName(f.layer))}</span> ` +
            `${esc(f.spec.name)}</button>`,
        )
        .join("")
    : "";

  return new Set(results.map((f) => f.spec.id));
}

/* ---------------------------------------------------------------- *
 *  Detail panel
 * ---------------------------------------------------------------- */

function levelLine(spec: NodeSpec, level: number, label: string): string {
  if (spec.kind === "anchor") return label;
  if (spec.kind === "gen") return `×${fmt(level)}`;
  if (spec.kind === "upgrade") return level > 0 ? "owned" : "not bought";
  if (spec.gateway) return level > 0 ? "opened" : "not opened";
  return `${level} / ${spec.maxLevel}`;
}

const VERBS: Record<string, [string, string]> = {
  requires: ["needs", "unlocks"],
  career: ["needs", "unlocks"],
  affects: ["boosted by", "boosts"],
  currency: ["fed by", "feeds"],
  fight: ["fights", "fights"],
};

function renderConnections(id: string): string {
  const links = connectionsOf(id);
  if (!links.length) return "";
  return (
    `<div class="tdlinks">` +
    links
      .slice(0, 12)
      .map((c) => {
        const verb = VERBS[c.family]?.[c.outgoing ? 1 : 0] ?? c.family;
        return (
          `<button class="tdlink ${c.family}" data-goto="${c.id}">` +
          `<span class="v">${verb}</span> ${esc(c.name)}</button>`
        );
      })
      .join("") +
    (links.length > 12 ? `<span class="counthint">+${links.length - 12} more</span>` : "") +
    `</div>`
  );
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
    `<span class="tdl">${esc(levelLine(spec, st.level, st.label))}</span></div>` +
    `<div class="tdd">${esc(spec.desc)}${extra}</div>` +
    (reason ? `<div class="tdreq">${esc(reason)}</div>` : "") +
    renderConnections(spec.id) +
    `<div class="tdf">${actionsFor(spec)}</div>`;
}

function actionsFor(spec: NodeSpec): string {
  const st = statusOf(spec);
  if (spec.kind === "anchor") {
    return `<span class="skc ${st.unlocked ? "ok" : "no"}">${esc(st.label)}</span>`;
  }
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
