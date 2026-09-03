/**
 * The whole game as one graph.
 *
 * `treemodel.ts` answers "what is this node"; this module answers "what is it wired to".
 * It builds one hierarchy — you at the centre, tools, upgrades, career and the eight
 * branches hanging off it — plus every edge the data implies, sorted into families that
 * can be switched on and off. Node specs come from `treemodel`; nothing is duplicated.
 *
 * The hierarchy is derived, not authored: a skill's parent is its first prerequisite, so
 * the trunk of a branch falls out of `req` on its own and every *other* prerequisite
 * becomes a `requires` arc. Two effect links are deliberately missing — see `buildEdges`.
 */

import type { BranchId } from "../core/types";
import type { Reveal } from "./viewstore";
import type { Density, TreeEdge, WebNode } from "./tree";
import { setDensity } from "./tree";
import { persistView, view, viewIsFresh } from "./viewstore";
import type { NodeSpec } from "./treemodel";
import { anchorSpec, genSpec, register, skillSpec, upgradeSpec } from "./treemodel";
import { D, S, SKILL_BY_ID } from "../core/engine";
import { SKILLS } from "../data/skills.generated";
import { UPGRADES } from "../data/upgrades.generated";
import { GENERATORS } from "../data/generators";
import { BRANCHES } from "../data/branches";
import { RANKS } from "../data/ranks";
import { TRACKS } from "../data/tracks";
import { fmt } from "../core/format";

export interface Family {
  id: string;
  name: string;
  /** drawn unless the player says otherwise */
  on: boolean;
}

export const FAMILIES: Family[] = [
  { id: "requires", name: "requires", on: true },
  { id: "currency", name: "currency", on: true },
  { id: "fight", name: "rivalry", on: true },
  { id: "career", name: "career", on: false },
  { id: "affects", name: "affects", on: false },
];

/* ---------------------------------------------------------------- *
 *  Nodes
 * ---------------------------------------------------------------- */

const kids = new Map<string, string[]>();
const parentOf = new Map<string, string>();
const specOf = new Map<string, NodeSpec>();
const edges: TreeEdge[] = [];
/**
 * Nodes that lay their subtree out on their own — see `WebNode.cluster`. A `block` is a
 * hub whose children are all leaves and would only ever read as a halo: a grid instead.
 */
const clusters = new Map<string, "fan" | "block">();

function add(spec: NodeSpec, parent?: string): NodeSpec {
  register(spec);
  specOf.set(spec.id, spec);
  if (parent) {
    parentOf.set(spec.id, parent);
    if (!kids.has(parent)) kids.set(parent, []);
    kids.get(parent)!.push(spec.id);
    edges.push({ from: parent, to: spec.id, key: `tree:${parent}>${spec.id}`, family: "tree" });
  }
  return spec;
}

function link(from: string, to: string, family: string): void {
  if (from === to || !specOf.has(from) || !specOf.has(to)) return;
  edges.push({ from, to, key: `${family}:${from}>${to}`, family });
}

const countOwned = (ids: string[], has: (id: string) => boolean): [number, number] => [
  ids.filter(has).length,
  ids.length,
];

/** A fold-out heading: not merchandise, but it counts what is underneath it. */
function hub(key: string, name: string, desc: string, count: () => [number, number]): NodeSpec {
  const spec = anchorSpec(`hub:${key}`, name, desc, "Hub");
  spec.flavour = "hub";
  clusters.set(spec.id, "fan");
  spec.live = () => {
    const [have, total] = count();
    return { label: `${have}/${total}`, reached: have > 0, fill: total ? have / total : 0 };
  };
  return spec;
}

const skId = (id: string) => `sk:${id}`;
const upId = (id: string) => `up:${id}`;
const genNodeId = (id: string) => `gen:${id}`;

const YOU = "an:hub:you";

/* ---------------------------------------------------------------- *
 *  Build — runs once; the shape of the game does not change during a run
 * ---------------------------------------------------------------- */

function build(): void {
  /* the centre */
  const you = hub("you", "You", "One editor, one blinking cursor. Everything here is downstream of a keypress.", () => [1, 1]);
  you.flavour = "centre";
  you.live = () => ({ label: `${fmt(D.lps)} LOC/s`, reached: true, fill: 1 });
  add(you);

  /* Setup — a tool, then the eight tiers that multiply it */
  const genIds = GENERATORS.map((g) => g.id);
  const setup = add(
    hub("setup", "Setup", "Everything that writes code while you don't.", () =>
      countOwned(genIds, (id) => (S.gens[id] ?? 0) > 0),
    ),
    YOU,
  );
  for (const g of GENERATORS) {
    add(genSpec(g.id), setup.id);
    const tiers = UPGRADES.filter((u) => u.reqGen?.[0] === g.id).sort(
      (a, b) => (a.reqGen?.[1] ?? 0) - (b.reqGen?.[1] ?? 0),
    );
    for (const u of tiers) {
      add(upgradeSpec(u, [genNodeId(g.id)], u.reqGen?.[1] ?? 1), genNodeId(g.id));
    }
  }

  /* Upgrades — one fold per money-bought family; two of them are named after their tap */
  const shop = add(
    hub("upgrades", "Upgrades", "Bought with money, lost on a job hop.", () =>
      countOwned(UPGRADES.map((u) => u.id), (id) => !!S.upg[id]),
    ),
    YOU,
  );
  const ladder = (family: string, name: string, desc: string, parent: string): void => {
    const list = UPGRADES.filter((u) => u.family === family).sort((a, b) => a.cost - b.cost);
    const head = add(
      hub(family, name, desc, () => countOwned(list.map((u) => u.id), (id) => !!S.upg[id])),
      parent,
    );
    clusters.set(head.id, "block");
    for (const u of list) add(upgradeSpec(u, [head.id]), head.id);
  };
  ladder("output", "Output", "Raw lines per second, bought outright.", shop.id);
  ladder("income", "Income", "What a line is worth when it lands.", shop.id);
  ladder("knowledge", "Knowledge", "How fast lines turn into knowledge.", shop.id);
  ladder("offline", "Offline", "What the desk earns while you are not at it.", shop.id);
  ladder("luck", "Luck", "How often an opportunity finds you.", shop.id);

  const tap = (key: string, name: string, desc: string, family: string): void => {
    const node = add(anchorSpec(key, name, desc, "Tap"), shop.id);
    clusters.set(node.id, "block");
    const list = UPGRADES.filter((u) => u.family === family).sort((a, b) => a.cost - b.cost);
    for (const u of list) add(upgradeSpec(u, [node.id]), node.id);
  };
  tap("tap:clicks", "Manual lines", "Lines you typed by hand. Forty upgrades wait on this number.", "click");
  tap("tap:bugs", "Bugs squashed", "Every bug you closed, by hand or automatically.", "quality");

  /* Career — the ladder you climb, and the seven ways to climb it */
  const career = add(
    hub("career", "Career", "Ranks gate two hundred upgrades; your specialisation gates six more.", () => [
      S.rank + 1,
      RANKS.length,
    ]),
    YOU,
  );
  RANKS.forEach((r, i) => {
    add(anchorSpec(`rank:${i}`, r.name, r.note, `Rank ${String(i + 1).padStart(2, "0")}`), career.id);
  });
  for (const t of TRACKS) {
    const node = add(anchorSpec(`track:${t.id}`, t.name, t.sub, "Specialisation"), career.id);
    clusters.set(node.id, "block");
    const mine = UPGRADES.filter((u) => u.reqTrack === t.id).sort((a, b) => a.cost - b.cost);
    for (const u of mine) add(upgradeSpec(u, [node.id]), node.id);
  }

  /* Foundation and the branches: a skill's parent is its first prerequisite */
  const g0 = add(skillSpec(SKILL_BY_ID.g0), YOU);
  clusters.set(g0.id, "fan");
  for (const sk of SKILLS) {
    if (sk.id === "g0") continue;
    // the later global gateways hang off g0 and point at the branches they need with arcs
    add(skillSpec(sk), sk.branch === "global" ? g0.id : skId(sk.req[0] ?? "g0"));
  }
  for (const b of BRANCHES) {
    const gate = skId(`b_${b.id}`);
    // a branch is its own cluster: eight tier chains fanning out of the gateway
    clusters.set(gate, "fan");
    // its money upgrades get a fold of their own, so they do not crowd the gateway's ring
    const mine = UPGRADES.filter((u) => u.reqBranch === b.id).sort((x, y) => x.cost - y.cost);
    const shelf = add(
      hub(`branch:${b.id}`, `${b.name} upgrades`, `Bought with money, flavoured ${b.name}.`, () =>
        countOwned(mine.map((u) => u.id), (id) => !!S.upg[id]),
      ),
      gate,
    );
    clusters.set(shelf.id, "block");
    for (const u of mine) add(upgradeSpec(u, [shelf.id]), shelf.id);
  }

  buildEdges(setup.id);
}

/**
 * Everything that is not a parent link.
 *
 * Two effect links are deliberately absent: the `fx.gens` of the 96 generator upgrades and
 * the `fx.cur` of the 64 branch upgrades. In both the arc would land on the node that is
 * already the parent — a doubled line that says nothing.
 */
function buildEdges(setupId: string): void {
  for (const sk of SKILLS) {
    const id = skId(sk.id);
    const parent = parentOf.get(id);
    for (const r of sk.req) {
      if (skId(r) !== parent) link(skId(r), id, "requires");
    }
    // a skill that pays a *different* branch is the only thing sewing branches together
    if (sk.kind === "crossCurrency" && sk.target) link(id, skId(`b_${sk.target}`), "currency");
    // a branch skill reaching across into your desk
    for (const g of sk.gens ?? []) link(id, genNodeId(g), "affects");
    if (sk.kind === "cheaper") link(id, setupId, "affects");
  }

  for (const u of UPGRADES) {
    if (u.reqRank !== undefined) link(`an:rank:${u.reqRank}`, upId(u.id), "career");
  }

  for (const b of BRANCHES) {
    for (const rival of b.rivals ?? []) link(skId(`b_${b.id}`), skId(`b_${rival}`), "fight");
  }
}

build();

/* ---------------------------------------------------------------- *
 *  View state — which folds are open, which families are drawn
 * ---------------------------------------------------------------- */

/* a fresh store starts with the centre and Foundation open: you, four hubs, g1–g3, the eight gateways */
if (viewIsFresh) {
  view.open = [YOU, "sk:g0"];
  view.families = FAMILIES.filter((f) => f.on).map((f) => f.id);
}

const open = new Set(view.open);
const families = new Set(view.families);

function persist(): void {
  view.open = [...open];
  view.families = [...families];
  persistView();
}

export const mode = (): "web" | "layers" => view.mode;

export function setMode(next: "web" | "layers"): void {
  view.mode = next;
  persist();
}

export const reveal = (): Reveal => view.reveal;

export function setReveal(next: Reveal): void {
  view.reveal = next;
  persist();
}

export const density = (): Density => view.density;

export function setDensityMode(next: Density): void {
  view.density = next;
  setDensity(next);
  persist();
}

export const isOpen = (id: string): boolean => open.has(id);

export function toggleOpen(id: string): void {
  if (!open.delete(id)) open.add(id);
  persist();
}

/** Open every fold between the centre and this node, so a search result has somewhere to land. */
export function openPath(id: string): void {
  let cursor = parentOf.get(id);
  while (cursor) {
    open.add(cursor);
    cursor = parentOf.get(cursor);
  }
  persist();
}

export const familiesOn = (): Set<string> => new Set(families);

export function toggleFamily(id: string): void {
  if (!families.delete(id)) families.add(id);
  persist();
}

/** Changes whenever the drawn shape changes, so the tab knows when to rebuild the DOM. */
export const shapeKey = (): string => [...open].sort().join(",");

/* ---------------------------------------------------------------- *
 *  Reading the graph
 * ---------------------------------------------------------------- */

/** A folded child still exists — that is what makes its parent foldable — but has no subtree. */
const stub = (id: string): WebNode => ({ spec: specOf.get(id)!, open: false, children: [] });

export function webRoot(): WebNode {
  const node = (id: string): WebNode => {
    const children = kids.get(id) ?? [];
    const shape = clusters.get(id);
    return {
      spec: specOf.get(id)!,
      open: open.has(id),
      children: open.has(id) ? children.map(node) : children.map(stub),
      cluster: !!shape,
      shape,
    };
  };
  return node(YOU);
}

export const webEdges = (): TreeEdge[] => edges;

export interface Connection {
  id: string;
  family: string;
  name: string;
  /** true when this node is the one doing the affecting */
  outgoing: boolean;
}

/** Everything wired to a node, for the detail panel. Parent links are left out — you can see those. */
export function connectionsOf(id: string): Connection[] {
  const out: Connection[] = [];
  for (const e of edges) {
    if (e.family === "tree") continue;
    if (e.from === id) {
      out.push({ id: e.to, family: e.family, name: specOf.get(e.to)?.name ?? e.to, outgoing: true });
    } else if (e.to === id) {
      out.push({ id: e.from, family: e.family, name: specOf.get(e.from)?.name ?? e.from, outgoing: false });
    }
  }
  return out;
}

/**
 * What buying this node opens up.
 *
 * `connectionsOf` deliberately drops parent links because you can see them on the canvas —
 * but the parent link *is* the unlock, and the detail panel is the one place where the
 * answer to "what does this get me next?" has to be spelled out. Children first, then any
 * node that names this one as a second prerequisite.
 */
export function opensOf(id: string): Connection[] {
  const seen = new Set<string>();
  const out: Connection[] = [];
  const take = (to: string, family: string): void => {
    if (seen.has(to) || !specOf.has(to)) return;
    seen.add(to);
    out.push({ id: to, family, name: specOf.get(to)!.name, outgoing: true });
  };
  for (const child of kids.get(id) ?? []) take(child, "requires");
  for (const e of edges) if (e.family === "requires" && e.from === id) take(e.to, "requires");
  return out;
}

/** Every node in the game, for a search that does not care which fold it is behind. */
export const allWebNodes = (): NodeSpec[] => [...specOf.values()];

/**
 * Which region of the map a node belongs to. The first-ring ancestor is right but useless
 * for a branch skill — everything under Foundation would read "First Principles" — so a
 * branch gateway on the way up wins.
 */
export function hubOf(id: string): string {
  let cursor: string | undefined = id;
  let below = id;
  while (cursor && parentOf.has(cursor)) {
    if (cursor.startsWith("sk:b_")) return specOf.get(cursor)?.name ?? "";
    below = cursor;
    cursor = parentOf.get(cursor);
  }
  return specOf.get(below)?.name ?? "";
}

export const edgeCount = (family: string): number => edges.filter((e) => e.family === family).length;
export const nodeCount = (): number => specOf.size;
export const branchHubId = (b: BranchId): string => skId(`b_${b}`);
