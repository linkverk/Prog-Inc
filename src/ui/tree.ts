/**
 * The tree canvas: layouts, edges, nodes, zoom, pan.
 *
 * Deliberately knows nothing about the game. It is handed flat node specs and a function
 * that reports the live state of one, so the same renderer draws skills, generators, shop
 * upgrades and anchors. Everything game-shaped lives in `treemodel.ts` / `treegraph.ts`.
 *
 * Three layouts share one renderer: rows (a skill branch), columns (a ladder) and radial
 * (the web). A layout decides where nodes sit *and* how an edge between two of them is
 * drawn, which is why `pathOf` travels with the layout rather than living here.
 *
 * Split in two on purpose. `buildTree` creates the DOM once, `paintTree` only rewrites
 * classes and short labels — the tab repaints every couple of seconds, and a rebuild would
 * throw away the zoom, the scroll position and the selected node.
 */

import { esc } from "./dom";

const SVG_NS = "http://www.w3.org/2000/svg";

const NODE_W = 124;
const NODE_H = 60;

export type Density = "tight" | "normal";

/**
 * Everything that decides how much air sits between nodes.
 *
 * The radial layout hands out angle by what a box needs where it sits (`arc`), so these are
 * the only knobs: density is gaps, never shares of the circle.
 */
interface Metrics {
  gapX: number;
  gapY: number;
  pad: number;
  ringGap: number;
  /** breathing room between two neighbours on the same ring */
  arcGap: number;
  /** how far an edge leaves its node before it starts bending towards the child */
  bend: number;
}

const DENSITY: Record<Density, Metrics> = {
  tight: { gapX: 6, gapY: 20, pad: 12, ringGap: 14, arcGap: 6, bend: 12 },
  normal: { gapX: 12, gapY: 40, pad: 24, ringGap: 60, arcGap: 16, bend: 24 },
};

let M = DENSITY.tight;

export function setDensity(d: Density): void {
  M = DENSITY[d];
}
/** how hard a cross-link is pulled towards the centre; 0 = straight chord, 1 = through it */
const BUNDLE = 0.74;
const SIZES: Array<[number, number]> = [
  [150, 72], // you
  [140, 62], // hubs
  [124, 52], // everything further out: two lines of name, a level, a buy button
];

/** Far enough out to see a whole opened branch as a shape; names go at this distance. */
export const ZOOM_MIN = 0.35;
export const ZOOM_MAX = 1.4;
/**
 * Fitting a wide layout must not shrink the labels into a mosaic — a twelve-column layer
 * scrolls sideways instead.
 */
export const FIT_MIN = 0.6;
/** The web fits both ways, but never below the point where a name stops being a name. */
export const WEB_FIT_MIN = 0.6;

/** The slice of a node the canvas needs. `treemodel` adds the rest. */
export interface TreeNodeSpec {
  id: string;
  name: string;
  /** ids of prerequisites; only those present on this canvas become edges */
  req: string[];
  /** level a prerequisite must reach before its edge counts as live */
  reqLevel: number;
  /** extra class on the node: "gate", "gen", "upg", "hub", "anchor", "centre" */
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
  /** too far ahead to have been discovered: draw the shape, withhold the name */
  veiled?: boolean;
  /** progress bar, 0..1 */
  fill: number;
}

export interface TreeNode {
  spec: TreeNodeSpec;
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  /** polar position around `hub`, radial layout only — edges need it to bend along the ring */
  r?: number;
  a?: number;
  /** the centre this node was laid out around: its cluster's, not the map's */
  hub?: { x: number; y: number };
  /** has children that could be folded away */
  foldable?: boolean;
  open?: boolean;
}

export interface TreeEdge {
  from: string;
  to: string;
  key: string;
  /** "tree" | "requires" | "career" | "affects" | "currency" | "fight" */
  family: string;
}

export interface TreeLayout {
  nodes: TreeNode[];
  edges: TreeEdge[];
  width: number;
  height: number;
  /** how this layout draws the line between two of its nodes */
  pathOf: (a: TreeNode, b: TreeNode, family: string) => string;
}

/** A foldable hierarchy. The web layout walks this instead of rows. */
export interface WebNode {
  spec: TreeNodeSpec;
  children: WebNode[];
  /** false hides the whole subtree behind a chevron */
  open: boolean;
  /**
   * Lays its subtree out on its own and shows to its parent as one circle, so nothing
   * outside it can push its rings about. Hubs and branch gateways are clusters.
   */
  cluster?: boolean;
  /** `block` packs leaf children into a grid under the node; `fan` is rings (the default) */
  shape?: "fan" | "block";
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
  /** edge families to draw; "tree" is always drawn, and so is anything touching the
   *  selected node — a switched-off family still answers "what is this wired to?" */
  families?: Set<string> | null;
  /** the buy button on the node: its text and whether it is enabled; null hides it */
  buyLabel?: (spec: TreeNodeSpec) => { text: string; on: boolean } | null;
  /** native tooltip: description, price, why it is locked */
  title?: (spec: TreeNodeSpec) => string;
}

/* ---------------------------------------------------------------- *
 *  Grid layouts
 * ---------------------------------------------------------------- */

/** Connect every node to the prerequisites that are also on this canvas. */
function wireByReq(nodes: TreeNode[], width: number, height: number): TreeLayout {
  const here = new Set(nodes.map((n) => n.spec.id));
  const edges: TreeEdge[] = [];
  for (const n of nodes) {
    for (const req of n.spec.req) {
      if (here.has(req)) {
        edges.push({ from: req, to: n.spec.id, key: `${req}>${n.spec.id}`, family: "tree" });
      }
    }
  }
  return { nodes, edges, width, height, pathOf: gridPath };
}

function gridPath(a: TreeNode, b: TreeNode): string {
  const x1 = a.x + a.w / 2;
  const y1 = a.y + a.h;
  const x2 = b.x + b.w / 2;
  const y2 = b.y;
  return `M ${x1} ${y1} C ${x1} ${y1 + M.bend}, ${x2} ${y2 - M.bend}, ${x2} ${y2}`;
}

/** One row per tier, each row centred. The shape a skill branch wants. */
export function layoutRows(rows: TreeNodeSpec[][]): TreeLayout {
  const widest = rows.reduce((a, r) => Math.max(a, r.length), 1);
  const width = M.pad * 2 + widest * NODE_W + (widest - 1) * M.gapX;
  const height = M.pad * 2 + rows.length * NODE_H + (rows.length - 1) * M.gapY;

  const nodes: TreeNode[] = [];
  rows.forEach((row, r) => {
    const span = row.length * NODE_W + (row.length - 1) * M.gapX;
    const startX = Math.round((width - span) / 2);
    row.forEach((spec, i) => {
      nodes.push({
        spec,
        x: startX + i * (NODE_W + M.gapX),
        y: M.pad + r * (NODE_H + M.gapY),
        w: NODE_W,
        h: NODE_H,
        depth: r,
      });
    });
  });

  return wireByReq(nodes, width, height);
}

/**
 * One lane per column, descending. The shape a ladder wants — a family of upgrades, or a
 * generator and the eight tiers that improve it. A column keeps its x whatever its length,
 * so a short lane leaves a gap rather than sliding the others sideways.
 */
export function layoutColumns(lanes: TreeNodeSpec[][]): TreeLayout {
  const deepest = lanes.reduce((a, l) => Math.max(a, l.length), 1);
  const width = M.pad * 2 + lanes.length * NODE_W + (lanes.length - 1) * M.gapX;
  const height = M.pad * 2 + deepest * NODE_H + (deepest - 1) * M.gapY;

  const nodes: TreeNode[] = [];
  lanes.forEach((lane, c) => {
    lane.forEach((spec, i) => {
      nodes.push({
        spec,
        x: M.pad + c * (NODE_W + M.gapX),
        y: M.pad + i * (NODE_H + M.gapY),
        w: NODE_W,
        h: NODE_H,
        depth: i,
      });
    });
  });

  return wireByReq(nodes, width, height);
}

/* ---------------------------------------------------------------- *
 *  Radial layout — the web
 * ---------------------------------------------------------------- */

/* ---------------------------------------------------------------- *
 *  Radial layout — clusters of rings
 * ---------------------------------------------------------------- */

/** A laid-out subtree: items relative to the circle's centre, and how big the circle is. */
interface Sub {
  /** footprint radius — the necklace treats the whole subtree as this circle */
  F: number;
  /** the first item is the subtree's own root */
  items: TreeNode[];
}

/** One node of a fan, with what it needs from its ring. */
interface Member {
  node: WebNode;
  depth: number;
  /** half-diagonal of the box */
  F: number;
  children: Member[];
  angle: number;
  span: number;
}

const sizeAt = (depth: number) => SIZES[Math.min(depth, SIZES.length - 1)];
const isCluster = (n: WebNode) => !!n.cluster && n.open && n.children.length > 0;
/** the angle a circle of radius F takes up on a ring of radius r, gap included */
const arc = (F: number, r: number) => 2 * Math.asin(Math.min(1, (F + M.arcGap / 2) / r));

function boxItem(n: WebNode, depth: number, x: number, y: number): TreeNode {
  const [w, h] = sizeAt(depth);
  return { spec: n.spec, x: x - w / 2, y: y - h / 2, w, h, depth, foldable: n.children.length > 0, open: n.open };
}

function shift(items: TreeNode[], dx: number, dy: number): TreeNode[] {
  for (const it of items) {
    it.x += dx;
    it.y += dy;
    if (it.hub) it.hub = { x: it.hub.x + dx, y: it.hub.y + dy };
  }
  return items;
}

/**
 * Lay a subtree out on its own. Any open cluster inside it is *not* drawn here: it is
 * handed back through `sats`, in tree order, to become a satellite of the centre. Circles
 * inside circles doubled the map with every level; one necklace of circles does not.
 */
function place(n: WebNode, depth: number, sats: Sub[]): Sub {
  const [w, h] = sizeAt(depth);
  if (!n.open || n.children.length === 0) {
    return { F: Math.hypot(w, h) / 2, items: [boxItem(n, depth, 0, 0)] };
  }
  const kept: WebNode[] = [];
  for (const c of n.children) {
    if (!isCluster(c)) {
      kept.push(c);
      continue;
    }
    const mine: Sub[] = [];
    const sub = place(c, depth, mine);
    sats.push(sub, ...mine);
  }
  if (kept.length === 0) return { F: Math.hypot(w, h) / 2, items: [boxItem(n, depth, 0, 0)] };
  const leafy = kept.every((c) => !c.open || c.children.length === 0);
  return n.shape === "block" && leafy ? block(n, kept, depth) : fan(n, kept, depth, sats);
}

/** A grid under its hub: forty upgrades in a row read as a shop, not as a halo. */
function block(n: WebNode, kept: WebNode[], depth: number): Sub {
  const [w0, h0] = sizeAt(depth);
  const [w, h] = sizeAt(depth + 1);
  const k = kept.length;
  // as many columns as make the grid roughly square, so it packs into its circle
  const cols = Math.max(1, Math.min(k, Math.ceil(Math.sqrt((k * (h + M.gapY)) / (w + M.gapX)))));
  const rows = Math.ceil(k / cols);
  const gridW = cols * w + (cols - 1) * M.gapX;
  const gridH = rows * h + (rows - 1) * M.gapY;
  const totalW = Math.max(w0, gridW);
  const totalH = h0 + M.ringGap + gridH;
  const top = -totalH / 2;
  const items: TreeNode[] = [boxItem(n, depth, 0, top + h0 / 2)];
  kept.forEach((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = -gridW / 2 + col * (w + M.gapX) + w / 2;
    const y = top + h0 + M.ringGap + row * (h + M.gapY) + h / 2;
    items.push(boxItem(c, depth + 1, x, y));
  });
  return { F: Math.hypot(totalW / 2, totalH / 2) + M.pad, items };
}

/**
 * Rings around a root. A ring is only as wide as the boxes on it need, and a subtree gets
 * the angle its own boxes take up — not a share of the circle proportional to its leaves,
 * which is what used to spread a handful of nodes around a whole quadrant.
 */
function fan(n: WebNode, kept: WebNode[], depth: number, sats: Sub[]): Sub {
  const [w0, h0] = sizeAt(depth);
  const F0 = Math.hypot(w0, h0) / 2;

  const member = (c: WebNode, d: number): Member => {
    const [w, h] = sizeAt(depth + d);
    const m: Member = { node: c, depth: d, F: Math.hypot(w, h) / 2, children: [], angle: 0, span: 0 };
    if (c.open) {
      for (const cc of c.children) {
        if (!isCluster(cc)) {
          m.children.push(member(cc, d + 1));
          continue;
        }
        const mine: Sub[] = [];
        const sub = place(cc, depth + d + 1, mine);
        sats.push(sub, ...mine);
      }
    }
    return m;
  };
  const top = kept.map((c) => member(c, 1));

  const maxF: number[] = [F0];
  const visit = (m: Member): void => {
    maxF[m.depth] = Math.max(maxF[m.depth] ?? 0, m.F);
    m.children.forEach(visit);
  };
  top.forEach(visit);
  const maxDepth = maxF.length - 1;

  // a ring clears the ring inside it; it may have to grow to seat everything on it
  const radii: number[] = [0];
  for (let d = 1; d <= maxDepth; d++) radii[d] = radii[d - 1] + maxF[d - 1] + maxF[d] + M.ringGap;

  const spans = (m: Member): number => {
    const own = arc(m.F, radii[m.depth]);
    const kids = m.children.reduce((a, c) => a + spans(c), 0);
    m.span = Math.max(own, kids);
    return m.span;
  };
  let total = top.reduce((a, m) => a + spans(m), 0);
  for (let i = 0; i < 16 && total > 2 * Math.PI; i++) {
    const k = total / (2 * Math.PI);
    for (let d = 1; d <= maxDepth; d++) radii[d] *= k;
    total = top.reduce((a, m) => a + spans(m), 0);
  }

  // hand out the angle: each member its span, leftover shared evenly, start at the top
  const distribute = (ms: Member[], from: number, to: number): void => {
    if (ms.length === 0) return;
    const extra = (to - from - ms.reduce((a, m) => a + m.span, 0)) / ms.length;
    let cursor = from;
    for (const m of ms) {
      const wedge = m.span + extra;
      m.angle = cursor + wedge / 2;
      distribute(m.children, cursor, cursor + wedge);
      cursor += wedge;
    }
  };
  distribute(top, -Math.PI / 2, Math.PI * 1.5);

  const items: TreeNode[] = [boxItem(n, depth, 0, 0)];
  let F = F0;
  const emit = (m: Member): void => {
    const r = radii[m.depth];
    F = Math.max(F, r + m.F);
    const it = boxItem(m.node, depth + m.depth, r * Math.cos(m.angle), r * Math.sin(m.angle));
    it.r = r;
    it.a = m.angle;
    it.hub = { x: 0, y: 0 };
    items.push(it);
    m.children.forEach(emit);
  };
  top.forEach(emit);

  return { F: F + M.pad, items };
}

/**
 * You in the middle; everything else on one necklace around you. A closed hub is a box on
 * it, an open cluster is a circle on it, and a cluster that lives deep in the tree — an
 * opened branch, an opened ladder — sits right after the cluster that contains it, joined
 * to its parent by an arc. Circles of different sizes ride at different radii: each one is
 * pushed out just far enough to clear the centre, and neighbours are kept apart by the
 * angle their circles take up where they sit.
 */
export function layoutRadial(root: WebNode, all: TreeEdge[]): TreeLayout {
  const [w0, h0] = sizeAt(0);
  const F0 = Math.hypot(w0, h0) / 2;
  const subs: Sub[] = [];
  for (const c of root.children) {
    const mine: Sub[] = [];
    subs.push(place(c, 1, mine), ...mine);
  }

  let base = F0 + M.ringGap;
  const radius = (s: Sub) => base + s.F;
  let total = subs.reduce((a, s) => a + arc(s.F, radius(s)), 0);
  for (let i = 0; i < 24 && total > 2 * Math.PI; i++) {
    base *= Math.max(1.02, total / (2 * Math.PI));
    total = subs.reduce((a, s) => a + arc(s.F, radius(s)), 0);
  }

  const items: TreeNode[] = [boxItem(root, 0, 0, 0)];
  let F = F0;
  const extra = Math.max(0, 2 * Math.PI - total) / Math.max(1, subs.length);
  let cursor = -Math.PI / 2;
  for (const s of subs) {
    const r = radius(s);
    const wedge = arc(s.F, r) + extra;
    const a = cursor + wedge / 2;
    cursor += wedge;
    shift(s.items, r * Math.cos(a), r * Math.sin(a));
    const head = s.items[0];
    head.r = Math.hypot(cx(head), cy(head));
    head.a = Math.atan2(cy(head), cx(head));
    head.hub = { x: 0, y: 0 };
    F = Math.max(F, r + s.F);
    items.push(...s.items);
  }
  F += M.pad;

  const nodes = shift(items, F, F);
  const here = new Set(nodes.map((n) => n.spec.id));
  const edges = all.filter((e) => here.has(e.from) && here.has(e.to));
  const centre = { x: F, y: F };
  const pathOf = (a: TreeNode, b: TreeNode, family: string) =>
    family === "tree" ? treePath(a, b) : bundledPath(a, b, centre);

  return { nodes, edges, width: F * 2, height: F * 2, pathOf };
}

const cx = (n: TreeNode) => n.x + n.w / 2;
const cy = (n: TreeNode) => n.y + n.h / 2;

/** Parent to child: leave along the ring, arrive along the spoke. A block cell hangs straight down. */
function treePath(a: TreeNode, b: TreeNode): string {
  const centre = b.hub;
  if (!centre || b.r === undefined) return gridPath(a, b);
  const ra = Math.hypot(cx(a) - centre.x, cy(a) - centre.y);
  const aa = Math.atan2(cy(a) - centre.y, cx(a) - centre.x);
  const mid = (ra + b.r) / 2;
  const c1x = centre.x + mid * Math.cos(ra < 1 ? b.a! : aa);
  const c1y = centre.y + mid * Math.sin(ra < 1 ? b.a! : aa);
  const c2x = centre.x + mid * Math.cos(b.a!);
  const c2y = centre.y + mid * Math.sin(b.a!);
  return `M ${cx(a)} ${cy(a)} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${cx(b)} ${cy(b)}`;
}

/**
 * Everything that is not a parent link bows towards the middle. Forty straight chords
 * across a circle read as felt; the same forty bundled read as a few visible strands.
 */
function bundledPath(a: TreeNode, b: TreeNode, centre: { x: number; y: number }): string {
  const c1x = cx(a) + (centre.x - cx(a)) * BUNDLE;
  const c1y = cy(a) + (centre.y - cy(a)) * BUNDLE;
  const c2x = cx(b) + (centre.x - cx(b)) * BUNDLE;
  const c2y = cy(b) + (centre.y - cy(b)) * BUNDLE;
  return `M ${cx(a)} ${cy(a)} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${cx(b)} ${cy(b)}`;
}

/* ---------------------------------------------------------------- *
 *  Render
 * ---------------------------------------------------------------- */

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
    p.setAttribute("d", layout.pathOf(a, b, e.family));
    p.setAttribute("class", `tedge ${e.family}`);
    svg.appendChild(p);
    edges.set(e.key, p);
  }
  inner.appendChild(svg);

  const nodes = new Map<string, HTMLElement>();
  for (const n of layout.nodes) {
    // a div, not a button: the buy control inside it is a button of its own
    const b = document.createElement("div");
    b.className = "tnode";
    b.setAttribute("role", "button");
    b.tabIndex = 0;
    b.dataset.node = n.spec.id;
    b.style.left = `${n.x}px`;
    b.style.top = `${n.y}px`;
    b.style.width = `${n.w}px`;
    b.style.height = `${n.h}px`;
    b.innerHTML =
      `<span class="tn">${esc(n.spec.name)}</span>` +
      `<span class="tf"><span class="tl"></span>` +
      `<button class="tbuy" data-buy="${n.spec.id}" hidden></button></span>` +
      `<i class="tb"><b></b></i>` +
      (n.foldable ? `<span class="tx" data-toggle="${n.spec.id}"></span>` : "");
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
  const at = new Map(view.layout.nodes.map((n) => [n.spec.id, n]));
  const picked = opts.selected ? at.get(opts.selected)?.spec : undefined;
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
      (st.veiled ? " veiled" : "") +
      (opts.highlight ? (opts.highlight.has(n.spec.id) ? " hit" : " dim") : "");
    elm.setAttribute("aria-pressed", String(n.spec.id === opts.selected));

    // the name is written once at build time, so hiding it has to happen on every paint
    (elm.querySelector(".tn") as HTMLElement).textContent = st.veiled ? "???" : n.spec.name;
    (elm.querySelector(".tl") as HTMLElement).textContent = st.label;
    const filled = Math.max(0, Math.min(1, st.fill)) * 100;
    (elm.querySelector(".tb>b") as HTMLElement).style.width = `${filled.toFixed(0)}%`;

    const buy = elm.querySelector(".tbuy") as HTMLButtonElement;
    const offer = opts.buyLabel?.(n.spec) ?? null;
    buy.hidden = !offer;
    if (offer) {
      buy.textContent = offer.text;
      buy.disabled = !offer.on;
    }
    if (opts.title) elm.title = opts.title(n.spec);

    const chevron = elm.querySelector(".tx") as HTMLElement | null;
    if (chevron) {
      chevron.textContent = n.open ? "⌄" : "›";
      chevron.setAttribute("aria-label", n.open ? "Fold" : "Unfold");
    }
  }

  for (const e of view.layout.edges) {
    const path = view.edges.get(e.key);
    if (!path) continue;
    const need = at.get(e.to)?.spec.reqLevel ?? 1;
    const live = (levels.get(e.from) ?? 0) >= need;
    const hot = e.to === opts.selected || e.from === opts.selected;
    const on = e.family === "tree" || !opts.families || opts.families.has(e.family) || hot;
    path.setAttribute(
      "class",
      `tedge ${e.family}` + (live ? " live" : "") + (hot ? " hot" : "") + (on ? "" : " off"),
    );
  }
}

/* ---------------------------------------------------------------- *
 *  Viewport
 * ---------------------------------------------------------------- */

export function setZoom(view: TreeView, z: number): number {
  view.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
  view.inner.style.transform = `scale(${view.zoom})`;
  view.scale.style.width = `${Math.round(view.layout.width * view.zoom)}px`;
  view.scale.style.height = `${Math.round(view.layout.height * view.zoom)}px`;
  return view.zoom;
}

/** Zoom that makes the whole canvas fit the visible width — and the height too, if asked. */
export function fitZoom(view: TreeView, host: HTMLElement, floor = FIT_MIN, both = false): number {
  const roomW = host.clientWidth - 4;
  const roomH = host.clientHeight - 4;
  if (roomW <= 0) return view.zoom;
  let z = roomW / view.layout.width;
  if (both && roomH > 0) z = Math.min(z, roomH / view.layout.height);
  return setZoom(view, Math.max(floor, z));
}

/** Put the middle of the canvas in the middle of the viewport — where the web's centre is. */
export function centreView(view: TreeView, host: HTMLElement): void {
  host.scrollLeft = Math.max(0, (view.layout.width * view.zoom - host.clientWidth) / 2);
  host.scrollTop = Math.max(0, (view.layout.height * view.zoom - host.clientHeight) / 2);
}

/** Centre one node in the viewport. Used when a search result is picked. */
export function scrollNodeIntoView(view: TreeView, host: HTMLElement, id: string): void {
  const n = view.layout.nodes.find((x) => x.spec.id === id);
  if (!n) return;
  const px = (n.x + n.w / 2) * view.zoom;
  const py = (n.y + n.h / 2) * view.zoom;
  host.scrollLeft = Math.max(0, px - host.clientWidth / 2);
  host.scrollTop = Math.max(0, py - host.clientHeight / 2);
}

/**
 * Drag the canvas around. Only from empty space — a drag that starts on a node would
 * fight the click that selects it.
 */
export function enablePan(host: HTMLElement): void {
  let from: { x: number; y: number; left: number; top: number } | null = null;

  host.addEventListener("pointerdown", (e) => {
    if ((e.target as HTMLElement).closest(".tnode")) return;
    from = { x: e.clientX, y: e.clientY, left: host.scrollLeft, top: host.scrollTop };
    host.classList.add("panning");
    host.setPointerCapture(e.pointerId);
  });

  host.addEventListener("pointermove", (e) => {
    if (!from) return;
    host.scrollLeft = from.left - (e.clientX - from.x);
    host.scrollTop = from.top - (e.clientY - from.y);
  });

  const stop = () => {
    from = null;
    host.classList.remove("panning");
  };
  host.addEventListener("pointerup", stop);
  host.addEventListener("pointercancel", stop);
}
