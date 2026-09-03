/**
 * The tree canvas: layout, edges, nodes, zoom.
 *
 * Deliberately knows nothing about the game. It is handed flat node specs and a function
 * that reports the live state of one, so the same renderer draws skills, generators and
 * shop upgrades. Everything game-shaped lives in `treemodel.ts`.
 *
 * Split in two on purpose. `buildTree` creates the DOM once, `paintTree` only rewrites
 * classes and short labels — the tab repaints every couple of seconds, and a rebuild would
 * throw away the zoom, the scroll position and the selected node.
 */

import { esc } from "./dom";

const SVG_NS = "http://www.w3.org/2000/svg";

const NODE_W = 124;
const NODE_H = 60;
const GAP_X = 12;
const GAP_Y = 40;
const PAD = 24;
/** how far an edge leaves its node before it starts bending towards the child */
const BEND = 24;

export const ZOOM_MIN = 0.4;
export const ZOOM_MAX = 1.4;

/** The slice of a node the canvas needs. `treemodel` adds the rest. */
export interface TreeNodeSpec {
  id: string;
  name: string;
  /** ids of prerequisites; only those present on this canvas become edges */
  req: string[];
  /** level a prerequisite must reach before its edge counts as live */
  reqLevel: number;
  /** extra class on the node: "gate", "gen", "upg" */
  flavour?: string;
}

/** What a node looks like right now. Supplied per paint by the caller. */
export interface NodeStatus {
  level: number;
  unlocked: boolean;
  ready: boolean;
  maxed: boolean;
  /** the small label in the top-right of the node */
  label: string;
  /** progress bar, 0..1 */
  fill: number;
}

export interface TreeNode {
  spec: TreeNodeSpec;
  x: number;
  y: number;
}

export interface TreeEdge {
  from: string;
  to: string;
  key: string;
}

export interface TreeLayout {
  nodes: TreeNode[];
  edges: TreeEdge[];
  width: number;
  height: number;
}

export interface TreeView {
  layout: TreeLayout;
  scale: HTMLElement;
  inner: HTMLElement;
  nodes: Map<string, HTMLElement>;
  edges: Map<string, SVGPathElement>;
  zoom: number;
}

export interface PaintOpts {
  selected: string | null;
  statusOf: (spec: TreeNodeSpec) => NodeStatus;
  /** when set, ids inside it are highlighted and everything else is dimmed */
  highlight?: Set<string> | null;
}

/** Connect every node to the prerequisites that are also on this canvas. */
function wire(nodes: TreeNode[], width: number, height: number): TreeLayout {
  const here = new Set(nodes.map((n) => n.spec.id));
  const edges: TreeEdge[] = [];
  for (const n of nodes) {
    for (const req of n.spec.req) {
      if (here.has(req)) edges.push({ from: req, to: n.spec.id, key: `${req}>${n.spec.id}` });
    }
  }
  return { nodes, edges, width, height };
}

/** One row per tier, each row centred. The shape a skill branch wants. */
export function layoutRows(rows: TreeNodeSpec[][]): TreeLayout {
  const widest = rows.reduce((a, r) => Math.max(a, r.length), 1);
  const width = PAD * 2 + widest * NODE_W + (widest - 1) * GAP_X;
  const height = PAD * 2 + rows.length * NODE_H + (rows.length - 1) * GAP_Y;

  const nodes: TreeNode[] = [];
  rows.forEach((row, r) => {
    const span = row.length * NODE_W + (row.length - 1) * GAP_X;
    const startX = Math.round((width - span) / 2);
    row.forEach((spec, i) => {
      nodes.push({ spec, x: startX + i * (NODE_W + GAP_X), y: PAD + r * (NODE_H + GAP_Y) });
    });
  });

  return wire(nodes, width, height);
}

/**
 * One lane per column, descending. The shape a ladder wants — a family of upgrades, or a
 * generator and the eight tiers that improve it. A column keeps its x whatever its length,
 * so a short lane leaves a gap rather than sliding the others sideways.
 */
export function layoutColumns(lanes: TreeNodeSpec[][]): TreeLayout {
  const deepest = lanes.reduce((a, l) => Math.max(a, l.length), 1);
  const width = PAD * 2 + lanes.length * NODE_W + (lanes.length - 1) * GAP_X;
  const height = PAD * 2 + deepest * NODE_H + (deepest - 1) * GAP_Y;

  const nodes: TreeNode[] = [];
  lanes.forEach((lane, c) => {
    lane.forEach((spec, i) => {
      nodes.push({ spec, x: PAD + c * (NODE_W + GAP_X), y: PAD + i * (NODE_H + GAP_Y) });
    });
  });

  return wire(nodes, width, height);
}

function edgePath(a: TreeNode, b: TreeNode): string {
  const x1 = a.x + NODE_W / 2;
  const y1 = a.y + NODE_H;
  const x2 = b.x + NODE_W / 2;
  const y2 = b.y;
  return `M ${x1} ${y1} C ${x1} ${y1 + BEND}, ${x2} ${y2 - BEND}, ${x2} ${y2}`;
}

export function buildTree(host: HTMLElement, layout: TreeLayout): TreeView {
  const at = new Map(layout.nodes.map((n) => [n.spec.id, n]));

  host.innerHTML = "";
  const scale = document.createElement("div");
  scale.className = "treescale";
  const inner = document.createElement("div");
  inner.className = "treeinner";
  inner.style.width = `${layout.width}px`;
  inner.style.height = `${layout.height}px`;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "tedges");
  svg.setAttribute("width", String(layout.width));
  svg.setAttribute("height", String(layout.height));
  svg.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);

  const edges = new Map<string, SVGPathElement>();
  for (const e of layout.edges) {
    const a = at.get(e.from);
    const b = at.get(e.to);
    if (!a || !b) continue;
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", edgePath(a, b));
    p.setAttribute("class", "tedge");
    svg.appendChild(p);
    edges.set(e.key, p);
  }
  inner.appendChild(svg);

  const nodes = new Map<string, HTMLElement>();
  for (const n of layout.nodes) {
    const b = document.createElement("button");
    b.className = "tnode";
    b.dataset.node = n.spec.id;
    b.style.left = `${n.x}px`;
    b.style.top = `${n.y}px`;
    b.style.width = `${NODE_W}px`;
    b.style.height = `${NODE_H}px`;
    b.innerHTML =
      `<span class="tn">${esc(n.spec.name)}</span>` +
      `<span class="tl"></span>` +
      `<i class="tb"><b></b></i>`;
    inner.appendChild(b);
    nodes.set(n.spec.id, b);
  }

  scale.appendChild(inner);
  host.appendChild(scale);

  const view: TreeView = { layout, scale, inner, nodes, edges, zoom: 1 };
  setZoom(view, 1);
  return view;
}

export function paintTree(view: TreeView, opts: PaintOpts): void {
  const at = new Map(view.layout.nodes.map((n) => [n.spec.id, n.spec]));
  const picked = opts.selected ? at.get(opts.selected) : undefined;
  const deps = new Set(picked?.req ?? []);
  const levels = new Map<string, number>();

  for (const n of view.layout.nodes) {
    const elm = view.nodes.get(n.spec.id);
    if (!elm) continue;
    const st = opts.statusOf(n.spec);
    levels.set(n.spec.id, st.level);

    elm.className =
      "tnode" +
      (n.spec.flavour ? ` ${n.spec.flavour}` : "") +
      (st.level > 0 ? " owned" : "") +
      (st.maxed ? " max" : "") +
      (!st.unlocked ? " locked" : st.ready ? " ready" : "") +
      (n.spec.id === opts.selected ? " sel" : "") +
      (deps.has(n.spec.id) ? " dep" : "") +
      (opts.highlight ? (opts.highlight.has(n.spec.id) ? " hit" : " dim") : "");
    elm.setAttribute("aria-pressed", String(n.spec.id === opts.selected));

    (elm.querySelector(".tl") as HTMLElement).textContent = st.label;
    const filled = Math.max(0, Math.min(1, st.fill)) * 100;
    (elm.querySelector(".tb>b") as HTMLElement).style.width = `${filled.toFixed(0)}%`;
  }

  for (const e of view.layout.edges) {
    const path = view.edges.get(e.key);
    if (!path) continue;
    const need = at.get(e.to)?.reqLevel ?? 1;
    const live = (levels.get(e.from) ?? 0) >= need;
    const hot = e.to === opts.selected || e.from === opts.selected;
    path.setAttribute("class", "tedge" + (live ? " live" : "") + (hot ? " hot" : ""));
  }
}

export function setZoom(view: TreeView, z: number): number {
  view.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
  view.inner.style.transform = `scale(${view.zoom})`;
  view.scale.style.width = `${Math.round(view.layout.width * view.zoom)}px`;
  view.scale.style.height = `${Math.round(view.layout.height * view.zoom)}px`;
  return view.zoom;
}

/** Zoom that makes the whole canvas fit the visible width. */
export function fitZoom(view: TreeView, host: HTMLElement): number {
  const room = host.clientWidth - 4;
  if (room <= 0) return view.zoom;
  return setZoom(view, room / view.layout.width);
}

/** Centre one node in the viewport. Used when a search result is picked. */
export function scrollNodeIntoView(view: TreeView, host: HTMLElement, id: string): void {
  const n = view.layout.nodes.find((x) => x.spec.id === id);
  if (!n) return;
  const cx = (n.x + NODE_W / 2) * view.zoom;
  const cy = (n.y + NODE_H / 2) * view.zoom;
  host.scrollLeft = Math.max(0, cx - host.clientWidth / 2);
  host.scrollTop = Math.max(0, cy - host.clientHeight / 2);
}
