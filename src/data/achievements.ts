import type { Achievement, GameState } from "../core/types";
import { GENERATORS } from "./generators";
import { BRANCH_IDS } from "./branches";
import { SKILLS } from "./skills.generated";
import { UPGRADES } from "./upgrades.generated";

const countKeys = (o: Record<string, unknown>) => Object.keys(o).length;
const maxGen = (s: GameState) => Math.max(0, ...Object.values(s.gens));
const totalGens = (s: GameState) => Object.values(s.gens).reduce((a, b) => a + b, 0);
const skillLevels = (s: GameState) => Object.values(s.skills).reduce((a, b) => a + b, 0);
const skillsOwned = (s: GameState) => countKeys(s.skills);
const gatewaysOwned = (s: GameState) =>
  SKILLS.filter((k) => k.gateway && s.skills[k.id]).length;
const branchesOpen = (s: GameState) =>
  BRANCH_IDS.filter((b) => s.skills["b_" + b]).length;
const toolsOwned = (s: GameState) => GENERATORS.filter((g) => (s.gens[g.id] ?? 0) > 0).length;
const maxMastery = (s: GameState) =>
  Math.max(0, ...Object.values(s.mastery as Record<string, number>));

const GATEWAY_TOTAL = SKILLS.filter((k) => k.gateway).length;
const SUB_GATEWAYS = SKILLS.filter((k) => k.gateway && /_s\d$/.test(k.id));
const subsOpen = (s: GameState) => SUB_GATEWAYS.filter((k) => s.skills[k.id]).length;

/** How deep into any one branch the player has actually reached. */
const deepestTier = (s: GameState) =>
  SKILLS.reduce((a, k) => ((s.skills[k.id] ?? 0) > 0 ? Math.max(a, k.tier) : a), 0);

/** Skills sitting at their level ceiling — the real measure of commitment. */
const maxedSkills = (s: GameState) =>
  SKILLS.filter((k) => !k.gateway && (s.skills[k.id] ?? 0) >= k.maxLevel).length;

/** Every upgrade tier of at least one tool. */
const anyToolComplete = (s: GameState) =>
  GENERATORS.some((g) => {
    const tiers = UPGRADES.filter((u) => u.family === "generator" && u.reqGen?.[0] === g.id);
    return tiers.length > 0 && tiers.every((u) => s.upg[u.id]);
  });

const BRANCH_UPGRADE_TOTAL = UPGRADES.filter((u) => u.family.startsWith("branch:")).length;
const branchUpgradesOwned = (s: GameState) =>
  UPGRADES.filter((u) => u.family.startsWith("branch:") && s.upg[u.id]).length;

const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A counting award: the bar and the test read the same two numbers. */
const at = (
  id: string,
  emoji: string,
  name: string,
  desc: string,
  now: (s: GameState) => number,
  goal: number,
): Achievement => ({
  id, emoji, name, desc,
  test: (s) => now(s) >= goal,
  progress: (s) => [now(s), goal],
});

export const ACHIEVEMENTS: Achievement[] = [
  /* lines written */
  at("a_first", "🌱", "Hello, World", "Write your first line.", (s) => s.totalLoc, 1),
  at("a_k", "📄", "A Thousand Words", "1K lifetime lines.", (s) => s.totalLoc, 1e3),
  at("a_m", "📚", "Megabase", "1M lifetime lines.", (s) => s.totalLoc, 1e6),
  at("a_b", "🏛️", "Monolith", "1B lifetime lines.", (s) => s.totalLoc, 1e9),
  at("a_t", "🌍", "Planet Scale", "1T lifetime lines.", (s) => s.totalLoc, 1e12),
  at("a_qa", "✨", "Beyond Counting", "1Qa lifetime lines.", (s) => s.totalLoc, 1e15),
  at("a_qi", "🌠", "Past Comprehension", "1Qi lifetime lines.", (s) => s.totalLoc, 1e18),
  at("a_sx", "🕳️", "The Number Stopped Helping", "1Sx lifetime lines.", (s) => s.totalLoc, 1e21),
  at("a_run1b", "🏃", "One Good Run", "1B lines in a single job.", (s) => s.runLoc, 1e9),
  at("a_run1t", "🔥", "A Very Good Run", "1T lines in a single job.", (s) => s.runLoc, 1e12),

  /* clicking */
  at("a_c100", "👆", "Warmed Up", "100 manual lines.", (s) => s.clicks, 100),
  at("a_c1k", "💪", "Carpal Tunnel", "1,000 manual lines.", (s) => s.clicks, 1000),
  at("a_c10k", "🤖", "Are You A Macro?", "10,000 manual lines.", (s) => s.clicks, 1e4),
  at("a_c100k", "🦾", "Typed Into Being", "100,000 manual lines.", (s) => s.clicks, 1e5),
  at("a_c1mm", "⌨️", "The Keyboard Gave Up First", "1,000,000 manual lines.", (s) => s.clicks, 1e6),

  /* tools */
  at("a_g25", "🔧", "Tooled Up", "Own 25 of any one tool.", maxGen, 25),
  at("a_g100", "🏭", "Industrial", "Own 100 of any one tool.", maxGen, 100),
  at("a_g500", "🌌", "Fleet", "Own 500 of any one tool.", maxGen, 500),
  at("a_g1k", "🛰️", "Overkill", "Own 1,000 of any one tool.", maxGen, 1000),
  at("a_gall", "🧰", "Full Toolbox", "Own at least one of every tool.", toolsOwned, GENERATORS.length),
  at("a_gsum", "📦", "Well Equipped", "5,000 tools in total.", totalGens, 5000),
  at("a_gsum2", "🏗️", "An Entire Industry", "25,000 tools in total.", totalGens, 25000),
  {
    id: "a_gtiers", emoji: "⚙️", name: "Fully Upgraded",
    desc: "Buy every upgrade tier of one tool.",
    test: anyToolComplete,
  },

  /* money */
  at("a_m1m", "💵", "Six Figures", "Hold $1M at once.", (s) => s.money, 1e6),
  at("a_m1b", "🏦", "Bank Error", "Hold $1B at once.", (s) => s.money, 1e9),
  at("a_m1t", "💎", "Absurd", "Hold $1T at once.", (s) => s.money, 1e12),
  at("a_m1qa", "🪙", "Fiscally Unreasonable", "Hold $1Qa at once.", (s) => s.money, 1e15),
  at("a_m1qi", "🏝️", "Buy The Island", "Hold $1Qi at once.", (s) => s.money, 1e18),

  /* career */
  at("a_r4", "🎓", "Employed", "Reach the fifth rank.", (s) => s.rank, 4),
  at("a_r7", "📈", "Scope Creep", "Reach the eighth rank.", (s) => s.rank, 7),
  at("a_r11", "👔", "Corner Office", "Reach the twelfth rank.", (s) => s.rank, 11),
  at("a_r15", "🏆", "Laureate", "Reach the final rank.", (s) => s.rank, 15),

  /* shop upgrades */
  at("a_u10", "🛒", "Reinvesting", "Buy 10 upgrades in one run.", (s) => countKeys(s.upg), 10),
  at("a_u50", "💼", "Fully Equipped", "Buy 50 upgrades in one run.", (s) => countKeys(s.upg), 50),
  at("a_u150", "🏬", "The Whole Shelf", "Buy 150 upgrades in one run.", (s) => countKeys(s.upg), 150),
  at("a_u300", "🏙️", "Nothing Left To Buy", "Buy 300 upgrades in one run.", (s) => countKeys(s.upg), 300),
  at("a_u500", "🛍️", "Retail Therapy", "Buy 500 upgrades in one run.", (s) => countKeys(s.upg), 500),
  at("a_ubranch", "🎨", "Every Flavour", "Own every branch-flavoured upgrade at once.",
    branchUpgradesOwned, BRANCH_UPGRADE_TOTAL),

  /* gateways and branches */
  at("a_gate1", "🚪", "First Door", "Open your first branch.", branchesOpen, 1),
  at("a_gate3", "🗝️", "Three Ways In", "Open three branches in one run.", branchesOpen, 3),
  at("a_gate8", "🌈", "Nothing Left To Open", "Open all eight branches in one run.", branchesOpen, 8),
  at("a_sub1", "🪜", "Going Deeper", "Open your first sub-path.", subsOpen, 1),
  at("a_sub12", "🧗", "Past The Shallows", "Open twelve sub-paths in one run.", subsOpen, 12),
  at("a_sub24", "⛰️", "Halfway Down", "Open twenty-four sub-paths in one run.", subsOpen, 24),
  at("a_sub48", "🧯", "Every Sub-Path", "Open every sub-path at once.", subsOpen, SUB_GATEWAYS.length),
  at("a_gatesall", "🧭", "Every Path Walked", "Own every gateway at once.", gatewaysOwned, GATEWAY_TOTAL),

  /* skills */
  at("a_lv50", "🧠", "Studious", "50 skill levels in one run.", skillLevels, 50),
  at("a_lv300", "🔮", "Polymath", "300 skill levels in one run.", skillLevels, 300),
  at("a_lv1200", "🧘", "Ten-X Mindset", "1,200 skill levels in one run.", skillLevels, 1200),
  at("a_lv2500", "🌟", "Compounding", "2,500 skill levels in one run.", skillLevels, 2500),
  at("a_sk100", "📗", "A Hundred Things", "Own 100 different skills.", skillsOwned, 100),
  at("a_sk300", "📙", "Three Hundred Things", "Own 300 different skills.", skillsOwned, 300),
  at("a_sk600", "📕", "The Whole Tree", "Own every skill at once.", skillsOwned, SKILLS.length),
  at("a_max1", "🔨", "Taken To The Ceiling", "Take one skill to its last level.", maxedSkills, 1),
  at("a_max10", "🧱", "Ten At The Ceiling", "Max out ten skills.", maxedSkills, 10),
  at("a_max50", "🗿", "Fifty At The Ceiling", "Max out fifty skills.", maxedSkills, 50),
  at("a_t3", "🪞", "Working Knowledge", "Reach tier 3 in any branch.", deepestTier, 3),
  at("a_t5", "🧬", "Specialism", "Reach tier 5 in any branch.", deepestTier, 5),
  at("a_t6", "🛸", "The Frontier", "Reach tier 6 in any branch.", deepestTier, 6),
  at("a_t7", "👑", "Capstone", "Buy a tier 7 capstone.", deepestTier, 7),

  /* branch currencies — one per branch, so every faucet has a goal of its own */
  ...BRANCH_IDS.map((b) =>
    at(
      `a_cur_${b}`,
      "◇",
      `Fluent In ${title(b)}`,
      `Earn 1M of the ${title(b)} currency over your career.`,
      (s) => s.curLife[b] ?? 0,
      1e6,
    ),
  ),

  /* job hops and reputation */
  at("a_hop1", "🚪", "Two Weeks Notice", "Hop to a new job once.", (s) => s.hops, 1),
  at("a_hop5", "🧳", "Serial Leaver", "Hop five times.", (s) => s.hops, 5),
  at("a_hop25", "🗺️", "A Long CV", "Hop twenty-five times.", (s) => s.hops, 25),
  at("a_rep10", "⭐", "Known Quantity", "Earn 10 lifetime stars.", (s) => s.repLife, 10),
  at("a_rep200", "🌟", "Household Name", "Earn 200 lifetime stars.", (s) => s.repLife, 200),
  at("a_rep5k", "💫", "An Institution", "Earn 5,000 lifetime stars.", (s) => s.repLife, 5000),

  /* bugs and events */
  at("a_bug500", "🐛", "Exterminator", "Squash 500 bugs by hand.", (s) => s.bugsKilled, 500),
  at("a_bug10k", "🪳", "Pest Control", "Squash 10,000 bugs.", (s) => s.bugsKilled, 1e4),
  at("a_bug100k", "🧼", "Sterile Field", "Squash 100,000 bugs.", (s) => s.bugsKilled, 1e5),
  at("a_seen1k", "👁️", "You Have Seen Things", "Have 1,000 bugs appear.", (s) => s.bugsSeen, 1000),
  at("a_ev10", "🍀", "Right Place", "Catch 10 opportunities.", (s) => s.events, 10),
  at("a_ev100", "🎰", "Manufactured Luck", "Catch 100 opportunities.", (s) => s.events, 100),
  at("a_bounty", "💸", "Paying It Forward", "Pay out $1M in bug bounties.", (s) => s.bountyPaid, 1e6),

  /* knowledge */
  at("a_kp1k", "💡", "Well Read", "Hold 1,000 knowledge at once.", (s) => s.kp, 1000),
  at("a_kp1m", "🧿", "Deeply Read", "Hold 1M knowledge at once.", (s) => s.kp, 1e6),
  at("a_kpspent", "🎒", "Tuition Paid", "Spend 1M knowledge over your career.", (s) => s.kpSpent, 1e6),

  /* specialisations */
  {
    id: "a_trk1", emoji: "🧭", name: "Found Your Thing",
    desc: "Choose a specialisation.",
    test: (s) => !!s.track,
  },
  at("a_trk3", "🔀", "Career Changer", "Earn mastery in three tracks.", (s) => countKeys(s.mastery), 3),
  at("a_trkall", "🎓", "Tried Everything", "Earn mastery in all seven tracks.", (s) => countKeys(s.mastery), 7),
  at("a_mast5", "🥇", "True Specialist", "Reach mastery 5 in one track.", maxMastery, 5),
  at("a_mast10", "🏅", "Nothing Left To Master", "Reach mastery 10 in one track.", maxMastery, 10),

  /* the awkward ones: no bar, because printing the number would give the trick away */
  {
    id: "a_secret_norush", emoji: "🧊", name: "The Slow Route",
    desc: "Reach the final rank without ever hopping.",
    test: (s) => s.rank >= 15 && s.hops === 0,
    secret: true,
  },
  {
    id: "a_secret_wide", emoji: "🕸️", name: "Breadth First",
    desc: "Open all eight branches before your first job hop.",
    test: (s) => branchesOpen(s) >= 8 && s.hops === 0,
    secret: true,
  },
  {
    id: "a_secret_clickless", emoji: "🫥", name: "Hands Off",
    desc: "Reach 1M lifetime lines having clicked fewer than 100 times.",
    test: (s) => s.totalLoc >= 1e6 && s.clicks < 100,
    secret: true,
  },
  {
    id: "a_secret_clean", emoji: "🫧", name: "Spotless",
    desc: "Hold the twelfth rank with no open bugs at all.",
    test: (s) => s.rank >= 11 && s.bugs <= 0,
    secret: true,
  },
  {
    id: "a_secret_broke", emoji: "🪹", name: "All In",
    desc: "Own 200 upgrades while holding under $1,000.",
    test: (s) => countKeys(s.upg) >= 200 && s.money < 1000,
    secret: true,
  },
];
