/** Shared type vocabulary. Everything the game knows how to change lives in `Fx`. */

export type BranchId =
  | "algorithms"
  | "systems"
  | "craft"
  | "business"
  | "data"
  | "security"
  | "community"
  | "research";

export type TrackId =
  | "product"
  | "game"
  | "security"
  | "kernel"
  | "ai"
  | "compiler"
  | "embedded";

/** A bundle of multiplicative / additive modifiers. Every skill, upgrade, perk and
 *  specialisation reduces to one of these, so the engine has exactly one code path. */
export interface Fx {
  /** × all code output */
  all?: number;
  /** × click power */
  click?: number;
  /** + fraction of LOC/s granted per click */
  clickPct?: number;
  /** × money earned */
  money?: number;
  /** × knowledge earned */
  kp?: number;
  /** × rate at which bugs appear (values < 1 are good) */
  bugRate?: number;
  /** × how hard bugs bite (values < 1 are good) */
  sev?: number;
  /** × bugs closed per debug session */
  debug?: number;
  /** + passive bug cleanup, as a fraction of raw output */
  clean?: number;
  /** × opportunity frequency */
  luck?: number;
  /** offline earning rate, 0..1 — the highest wins rather than multiplying */
  offEff?: number;
  /** + hours of offline cap */
  offCap?: number;
  /** × generator prices (values < 1 are good) */
  costMult?: number;
  /** × output of the generators named in `gens` */
  genMult?: number;
  gens?: string[];
  /** × gain of specific branch currencies */
  cur?: Partial<Record<BranchId, number>>;

  /* specialisation-only knobs */
  hypeCap?: number;
  hypeDecay?: number;
  release?: number;
  bounty?: number;
  /** + per-upgrade compounding bonus (Compiler Engineer) */
  pass?: number;
  /** + knowledge scaling exponent (AI Engineer) */
  kexp?: number;
  /** × reputation earned on a job hop */
  rep?: number;
}

export type EffectKind =
  | "output"
  | "clickPower"
  | "clickPct"
  | "income"
  | "knowledge"
  | "genGroup"
  | "bugSlow"
  | "bugSoften"
  | "debugPower"
  | "autoClean"
  | "cheaper"
  | "offline"
  | "luck"
  | "currency"
  | "crossCurrency";

export interface Skill {
  id: string;
  branch: BranchId | "global";
  name: string;
  desc: string;
  /** depth inside its branch: 0 for gateways, 1..5 otherwise */
  tier: number;
  /** prerequisite skill ids, all required */
  req: string[];
  /** minimum level each prerequisite must be at; 1 unless stated */
  reqLevel?: number;
  /** true for path-opening skills: one purchase, never upgradable */
  gateway?: boolean;
  /** which pile pays for it */
  currency: "kp" | BranchId;
  /** cost of the first level */
  cost: number;
  /** cost multiplier per level */
  costGrowth: number;
  /** 1 for gateways */
  maxLevel: number;
  kind: EffectKind;
  /** magnitude of a single level */
  power: number;
  /** generator ids, for `genGroup` */
  gens?: string[];
  /** target branch, for `crossCurrency` / `currency` */
  target?: BranchId;
}

export interface Upgrade {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  cost: number;
  family: string;
  fx: Fx;
  /** unlock conditions, all optional and all ANDed */
  reqRank?: number;
  reqClicks?: number;
  reqGen?: [string, number];
  reqBugsKilled?: number;
  reqBranch?: BranchId;
  reqTrack?: TrackId;
}

export interface Generator {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  cost: number;
  rate: number;
  clean?: number;
  machine?: boolean;
}

export interface Rank {
  name: string;
  req: number;
  note: string;
}

export interface Branch {
  id: BranchId;
  name: string;
  /** currency display name */
  curName: string;
  /** currency symbol */
  sym: string;
  /** one line on what the branch is about */
  blurb: string;
  /** one line on how its currency is earned */
  faucet: string;
  /** KP price of the branch gateway */
  gateCost: number;
  /** branches this one fights with over the same faucet — see PLAN.md §2 */
  rivals?: BranchId[];
}

export interface Perk {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  max: number;
  cost: (level: number) => number;
}

export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  test: (s: GameState) => boolean;
}

export interface Buff {
  id: string;
  emoji: string;
  name: string;
  mult: number;
  kind: "loc" | "money";
  until: number;
}

export interface GameState {
  v: number;

  loc: number;
  runLoc: number;
  totalLoc: number;
  money: number;
  kp: number;
  kpSpent: number;
  rep: number;
  repLife: number;

  /** branch currency balances; a branch only accrues once its gateway is open */
  cur: Record<BranchId, number>;
  /** lifetime earned per branch currency, for display */
  curLife: Record<BranchId, number>;

  gens: Record<string, number>;
  upg: Record<string, 1>;
  /** skill id -> level owned (gateways are always 1) */
  skills: Record<string, number>;
  ach: Record<string, 1>;
  perks: Record<string, number>;
  mastery: Partial<Record<TrackId, number>>;

  track: TrackId | null;
  trackDeferred: boolean;

  hype: number;
  relT: number;
  relLoc: number;

  clicks: number;
  bugs: number;
  bugsKilled: number;
  bugsSeen: number;
  bountyPaid: number;
  rank: number;
  hops: number;
  events: number;

  buffs: Buff[];
  bulk: number | "max";
  theme: "light" | "dark" | null;
  started: number;
  lastSave: number;
}
