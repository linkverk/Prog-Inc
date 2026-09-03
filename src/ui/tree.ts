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
 * `spread` is the one that matters most on the web. Sectors are handed out in proportion
 * to how many leaves a subtree shows, so a folded Foundation with eleven children takes
 * eleven fourteenths of the circle and squeezes its three siblings into slivers — which
 * then forces the whole ring outwards so those slivers still fit their nodes. Sharing by
 * the square root instead keeps a folded neighbour from crowding everyone against the
 * centre, and roughly halves the map.
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
  /** 1 shares angle by leaf count, 0.5 by its square root */
  spread: number;
}

const DENSITY: Record<Density, Metrics> = {
  tight: { gapX: 6, gapY: 20, pad: 12, ringGap: 18, arcGap: 6, bend: 12, spread: 0.5 },
  normal: { gapX: 12, gapY: 40, pad: 24, ringGap: 60, arcGap: 16, bend: 24, spread: 1 },
};

let M = DENSITY.tight;

export function setDensity(d: Density): void {
  M = DENSITY[d];
}
/** how hard a cross-link is pulled towards the centre; 0 = straight chord, 1 = through it */
const BUNDLE = 0.74;
const SIZES: Array<[number, number]> = [
  [150, 70], // you
  [140, 60], // hubs
  [112, 46], // everything further out
];

/** Low enough that an opened branch still fits on screen as a shape. */
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 1.4;
/**
 * Fitting a wide layout must not shrink the labels into a mosaic — a twelve-column layer
 * scrolls sideways instead. The web opts out: at overview zoom its shape is the point.
 */
export const FIT_MIN = 0.6;

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
  /** polar position, radial layout only — edges need it to bend along the ring */
  r?: number;
  a?: number;
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
  return `M ${x1} ${y1} C ${x1} ${y1 + BEND}, ${x2} ${y2 - BEND}, ${x2} ${y2}`;
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
      nodes.push({
        spec,
        x: startX + i * (NODE_W + GAP_X),
        y: PAD + r * (NODE_H + GAP_Y),
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
  const width = PAD * 2 + lanes.length * NODE_W + (lanes.length - 1) * GAP_X;
  const height = PAD * 2 + deepest * NODE_H + (deepest - 1) * GAP_Y;

  const nodes: TreeNode[] = [];
  lanes.forEach((lane, c) => {
    lane.forEach((spec, i) => {
      nodes.push({
        spec,
        x: PAD + c * (NODE_W + GAP_X),
        y: PAD + i * (NODE_H + GAP_Y),
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

interface Placed {
  node: WebNode;
  depth: number;
  angle: number;
  /** the wedge this node owns, in radians — how much room it has along its ring */
  span: number;
}

/** Leaves under a node, counting a folded node as one — that is what it looks like. */
function leaves(n: WebNode): number {
  if (!n.open || n.children.length === 0) return 1;
  return n.children.reduce((a, c) => a + leaves(c), 0);
}

const sizeAt = (depth: number) => SIZES[Math.min(depth, SIZES.length - 1)];

/**
 * Rings out from the centre, each subtree owning an angular slice proportional to how many
 * leaves it shows. A ring is pushed out far enough that its nodes fit round it, so opening
 * a big branch grows the map rather than overlapping it.
 */
export function layoutRadial(root: WebNode, all: TreeEdge[]): TreeLayout {
  const placed: Placed[] = [];

  const walk = (n: WebNode, depth: number, from: number, to: number): void => {
    placed.push({ node: n, depth, angle: (from + to) / 2, span: to - from });
    if (!n.open || n.children.length === 0) return;
    const total = n.children.reduce((a, c) => a + leaves(c), 0) || 1;
    let cursor = from;
    for (const c of n.children) {
      const span = ((to - from) * leaves(c)) / total;
      walk(c, depth + 1, cursor, cursor + span);
      cursor += span;
    }
  };
  // start at the top and go clockwise; a full turn for the root's children
  walk(root, 0, -Math.PI / 2, Math.PI * 1.5);

  const maxDepth = placed.reduce((a, p) => Math.max(a, p.depth), 0);

  /**
   * A ring has to satisfy two things at once: clear the boxes on the ring inside it, and be
   * long enough that the narrowest wedge on it still fits its own node. Averaging over the
   * ring is not enough — one crowded sector would overlap while a sparse one wasted room.
   */
  const reach = (d: number) => Math.max(...sizeAt(d)) / 2;
  const radii: number[] = [0];
  for (let d = 1; d <= maxDepth; d++) {
    const [w] = sizeAt(d);
    let tightest = 0;
    for (const p of placed) {
      if (p.depth !== d) continue;
      tightest = Math.max(tightest, (w + ARC_GAP) / Math.max(p.span, 1e-4));
    }
    radii[d] = Math.max(radii[d - 1] + reach(d - 1) + reach(d) + RING_GAP, tightest);
  }

  const rMax = radii[maxDepth] ?? 0;
  const [outerW, outerH] = sizeAt(maxDepth);
  const half = rMax + Math.max(outerW, outerH) / 2 + PAD;
  const width = half * 2;
  const height = half * 2;

  const nodes: TreeNode[] = placed.map((p) => {
    const [w, h] = sizeAt(p.depth);
    const r = radii[p.depth];
    return {
      spec: p.node.spec,
      x: half + r * Math.cos(p.angle) - w / 2,
      y: half + r * Math.sin(p.angle) - h / 2,
      w,
      h,
      depth: p.depth,
      r,
      a: p.angle,
      foldable: p.node.children.length > 0,
      open: p.node.open,
    };
  });

  const here = new Set(nodes.map((n) => n.spec.id));
  const edges = all.filter((e) => here.has(e.from) && here.has(e.to));

  const centre = { x: half, y: half };
  const pathOf = (a: TreeNode, b: TreeNode, family: string) =>
    family === "tree" ? radialPath(a, b, centre) : bundledPath(a, b, centre);

  return { nodes, edges, width, height, pathOf };
}

const cx = (n: TreeNode) => n.x + n.w / 2;
const cy = (n: TreeNode) => n.y + n.h / 2;

/** Parent to child: leave along the ring, arrive along the spoke. */
function radialPath(a: TreeNode, b: TreeNode, centre: { x: number; y: number }): string {
  if (a.r === undefined || b.r === undefined || a.a === undefined || b.a === undefined) {
    return `M ${cx(a)} ${cy(a)} L ${cx(b)} ${cy(b)}`;
  }
  const mid = (a.r + b.r) / 2;
  const c1x = centre.x + mid * Math.cos(a.a);
  const c1y = centre.y + mid * Math.sin(a.a);
  const c2x = centre.x + mid * Math.cos(b.a);
  const c2y = centre.y + mid * Math.sin(b.a);
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
    const b = document.createElement("button");
    b.className = "tnode";
    b.dataset.node = n.spec.id;
    b.style.left = `${n.x}px`;
    b.style.top = `${n.y}px`;
    b.style.width = `${n.w}px`;
    b.style.height = `${n.h}px`;
    b.innerHTML =
      `<span class="tn">${esc(n.spec.name)}</span>` +
      `<span class="tl"></span>` +
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
      (opts.highlight ? (opts.highlight.has(n.spec.id) ? " hit" : " dim") : "");
    elm.setAttribute("aria-pressed", String(n.spec.id === opts.selected));

    (elm.querySelector(".tl") as HTMLElement).textContent = st.label;
    const filled = Math.max(0, Math.min(1, st.fill)) * 100;
    (elm.querySelector(".tb>b") as HTMLElement).style.width = `${filled.toFixed(0)}%`;

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

/** Zoom that makes the whole canvas fit the visible width. */
export function fitZoom(view: TreeView, host: HTMLElement, floor = FIT_MIN): number {
  const room = host.clientWidth - 4;
  if (room <= 0) return view.zoom;
  return setZoom(view, Math.max(floor, room / view.layout.width));
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
