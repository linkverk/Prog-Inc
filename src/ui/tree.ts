/**
 * The skill tree canvas: layout, edges, nodes.
 *
 * Split in two on purpose. `buildTree` creates the DOM once, `paintTree` only rewrites
 * classes and short labels — the branches tab repaints every couple of seconds, and a
 * rebuild would throw away the zoom, the scroll position and the selected node.
 */

import type { Skill } from "../core/types";
import { S, SKILL_BY_ID, skillUnlocked } from "../core/engine";
import { skillCost } from "../core/effects";
import { esc } from "./dom";

const SVG_NS = "http://www.w3.org/2000/svg";

const NODE_W = 124;
const NODE_H = 52;
const GAP_X = 12;
const GAP_Y = 40;
const PAD = 24;
/** how far an edge leaves its node before it starts bending towards the child */
const BEND = 24;

export const ZOOM_MIN = 0.4;
export const ZOOM_MAX = 1.4;

export interface TreeNode {
  id: string;
  x: number;
  y: number;
  row: number;
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
  /** overrides the small label in the top-right of a node */
  labelOf?: (skill: Skill, level: number) => string;
}

/**
 * Place one row of ids per tier, centred, and connect every node to the prerequisites
 * that are also on this canvas. Pure: no DOM, no globals.
 */
export function layoutTree(rows: string[][]): TreeLayout {
  const widest = rows.reduce((a, r) => Math.max(a, r.length), 1);
  const width = PAD * 2 + widest * NODE_W + (widest - 1) * GAP_X;
  const height = PAD * 2 + rows.length * NODE_H + (rows.length - 1) * GAP_Y;

  const nodes: TreeNode[] = [];
  rows.forEach((row, r) => {
    const span = row.length * NODE_W + (row.length - 1) * GAP_X;
    const startX = Math.round((width - span) / 2);
    row.forEach((id, i) => {
      nodes.push({
        id,
        x: startX + i * (NODE_W + GAP_X),
        y: PAD + r * (NODE_H + GAP_Y),
        row: r,
      });
    });
  });

  const here = new Set(nodes.map((n) => n.id));
  const edges: TreeEdge[] = [];
  for (const n of nodes) {
    for (const req of SKILL_BY_ID[n.id]?.req ?? []) {
      if (here.has(req)) edges.push({ from: req, to: n.id, key: `${req}>${n.id}` });
    }
  }

  return { nodes, edges, width, height };
}

function edgePath(a: TreeNode, b: TreeNode): string {
  const x1 = a.x + NODE_W / 2;
  const y1 = a.y + NODE_H;
  const x2 = b.x + NODE_W / 2;
  const y2 = b.y;
  return `M ${x1} ${y1} C ${x1} ${y1 + BEND}, ${x2} ${y2 - BEND}, ${x2} ${y2}`;
}

export function buildTree(host: HTMLElement, rows: string[][]): TreeView {
  const layout = layoutTree(rows);
  const at = new Map(layout.nodes.map((n) => [n.id, n]));

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
    const sk = SKILL_BY_ID[n.id];
    if (!sk) continue;
    const b = document.createElement("button");
    b.className = "tnode";
    b.dataset.node = n.id;
    b.style.left = `${n.x}px`;
    b.style.top = `${n.y}px`;
    b.style.width = `${NODE_W}px`;
    b.style.height = `${NODE_H}px`;
    b.innerHTML =
      `<span class="tn">${esc(sk.name)}</span>` +
      `<span class="tl"></span>` +
      `<i class="tb"><b></b></i>`;
    inner.appendChild(b);
    nodes.set(n.id, b);
  }

  scale.appendChild(inner);
  host.appendChild(scale);

  const view: TreeView = { layout, scale, inner, nodes, edges, zoom: 1 };
  setZoom(view, 1);
  return view;
}

export function paintTree(view: TreeView, opts: PaintOpts): void {
  const picked = opts.selected ? SKILL_BY_ID[opts.selected] : undefined;
  const deps = new Set(picked?.req ?? []);

  for (const [id, elm] of view.nodes) {
    const sk = SKILL_BY_ID[id];
    if (!sk) continue;
    const level = S.skills[id] ?? 0;
    const maxed = level >= sk.maxLevel;
    const unlocked = skillUnlocked(sk);
    const balance = sk.currency === "kp" ? S.kp : S.cur[sk.currency];
    const ready = unlocked && !maxed && balance >= skillCost(sk, level);

    elm.className =
      "tnode" +
      (sk.gateway ? " gate" : "") +
      (level > 0 ? " owned" : "") +
      (maxed ? " max" : "") +
      (!unlocked ? " locked" : ready ? " ready" : "") +
      (id === opts.selected ? " sel" : "") +
      (deps.has(id) ? " dep" : "");
    elm.setAttribute("aria-pressed", String(id === opts.selected));

    const label = opts.labelOf
      ? opts.labelOf(sk, level)
      : sk.gateway
        ? level > 0
          ? "open"
          : "one-time"
        : `${level}/${sk.maxLevel}`;
    (elm.querySelector(".tl") as HTMLElement).textContent = label;

    const filled = sk.gateway ? (level > 0 ? 100 : 0) : (level / sk.maxLevel) * 100;
    (elm.querySelector(".tb>b") as HTMLElement).style.width = `${filled.toFixed(0)}%`;
  }

  for (const e of view.layout.edges) {
    const path = view.edges.get(e.key);
    if (!path) continue;
    const child = SKILL_BY_ID[e.to];
    const need = child?.reqLevel ?? 1;
    const live = (S.skills[e.from] ?? 0) >= need;
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
