import type { Achievement, GameState } from "../core/types";
import { GENERATORS } from "./generators";
import { BRANCH_IDS } from "./branches";
import { SKILLS } from "./skills.generated";

const countKeys = (o: Record<string, unknown>) => Object.keys(o).length;
const maxGen = (s: GameState) => Math.max(0, ...Object.values(s.gens));
const skillLevels = (s: GameState) => Object.values(s.skills).reduce((a, b) => a + b, 0);
const gatewaysOwned = (s: GameState) =>
  SKILLS.filter((k) => k.gateway && s.skills[k.id]).length;
const branchesOpen = (s: GameState) =>
  BRANCH_IDS.filter((b) => s.skills["b_" + b]).length;

export const ACHIEVEMENTS: Achievement[] = [
  { id: "a_first", emoji: "🌱", name: "Hello, World", desc: "Write your first line.", test: (s) => s.totalLoc >= 1 },
  { id: "a_k", emoji: "📄", name: "A Thousand Words", desc: "1K lifetime lines.", test: (s) => s.totalLoc >= 1e3 },
  { id: "a_m", emoji: "📚", name: "Megabase", desc: "1M lifetime lines.", test: (s) => s.totalLoc >= 1e6 },
  { id: "a_b", emoji: "🏛️", name: "Monolith", desc: "1B lifetime lines.", test: (s) => s.totalLoc >= 1e9 },
  { id: "a_t", emoji: "🌍", name: "Planet Scale", desc: "1T lifetime lines.", test: (s) => s.totalLoc >= 1e12 },
  { id: "a_qa", emoji: "✨", name: "Beyond Counting", desc: "1Qa lifetime lines.", test: (s) => s.totalLoc >= 1e15 },
  { id: "a_c100", emoji: "👆", name: "Warmed Up", desc: "100 manual lines.", test: (s) => s.clicks >= 100 },
  { id: "a_c1k", emoji: "💪", name: "Carpal Tunnel", desc: "1,000 manual lines.", test: (s) => s.clicks >= 1000 },
  { id: "a_c10k", emoji: "🤖", name: "Are You A Macro?", desc: "10,000 manual lines.", test: (s) => s.clicks >= 1e4 },
  { id: "a_g25", emoji: "🔧", name: "Tooled Up", desc: "Own 25 of any one tool.", test: (s) => maxGen(s) >= 25 },
  { id: "a_g100", emoji: "🏭", name: "Industrial", desc: "Own 100 of any one tool.", test: (s) => maxGen(s) >= 100 },
  { id: "a_g500", emoji: "🌌", name: "Fleet", desc: "Own 500 of any one tool.", test: (s) => maxGen(s) >= 500 },
  { id: "a_gall", emoji: "🧰", name: "Full Toolbox", desc: "Own at least one of every tool.", test: (s) => GENERATORS.every((g) => (s.gens[g.id] ?? 0) > 0) },
  { id: "a_m1m", emoji: "💵", name: "Six Figures", desc: "Hold $1M at once.", test: (s) => s.money >= 1e6 },
  { id: "a_m1b", emoji: "🏦", name: "Bank Error", desc: "Hold $1B at once.", test: (s) => s.money >= 1e9 },
  { id: "a_m1t", emoji: "💎", name: "Absurd", desc: "Hold $1T at once.", test: (s) => s.money >= 1e12 },
  { id: "a_r4", emoji: "🎓", name: "Employed", desc: "Reach the fifth rank.", test: (s) => s.rank >= 4 },
  { id: "a_r7", emoji: "📈", name: "Scope Creep", desc: "Reach the eighth rank.", test: (s) => s.rank >= 7 },
  { id: "a_r11", emoji: "👔", name: "Corner Office", desc: "Reach the twelfth rank.", test: (s) => s.rank >= 11 },
  { id: "a_r15", emoji: "🏆", name: "Laureate", desc: "Reach the final rank.", test: (s) => s.rank >= 15 },
  { id: "a_u10", emoji: "🛒", name: "Reinvesting", desc: "Buy 10 upgrades in one run.", test: (s) => countKeys(s.upg) >= 10 },
  { id: "a_u50", emoji: "💼", name: "Fully Equipped", desc: "Buy 50 upgrades in one run.", test: (s) => countKeys(s.upg) >= 50 },
  { id: "a_u150", emoji: "🏬", name: "The Whole Shelf", desc: "Buy 150 upgrades in one run.", test: (s) => countKeys(s.upg) >= 150 },
  { id: "a_gate1", emoji: "🚪", name: "First Door", desc: "Open your first branch.", test: (s) => branchesOpen(s) >= 1 },
  { id: "a_gate3", emoji: "🗝️", name: "Three Ways In", desc: "Open three branches in one run.", test: (s) => branchesOpen(s) >= 3 },
  { id: "a_gate8", emoji: "🌈", name: "Nothing Left To Open", desc: "Open all eight branches in one run.", test: (s) => branchesOpen(s) >= 8 },
  { id: "a_gatesall", emoji: "🧭", name: "Every Path Walked", desc: "Own all 36 gateways at once.", test: (s) => gatewaysOwned(s) >= 36 },
  { id: "a_lv50", emoji: "🧠", name: "Studious", desc: "50 skill levels in one run.", test: (s) => skillLevels(s) >= 50 },
  { id: "a_lv300", emoji: "🔮", name: "Polymath", desc: "300 skill levels in one run.", test: (s) => skillLevels(s) >= 300 },
  { id: "a_lv1200", emoji: "🧘", name: "Ten-X Mindset", desc: "1,200 skill levels in one run.", test: (s) => skillLevels(s) >= 1200 },
  { id: "a_hop1", emoji: "🚪", name: "Two Weeks' Notice", desc: "Hop to a new job once.", test: (s) => s.hops >= 1 },
  { id: "a_rep10", emoji: "⭐", name: "Known Quantity", desc: "Earn 10 lifetime stars.", test: (s) => s.repLife >= 10 },
  { id: "a_rep200", emoji: "🌟", name: "Household Name", desc: "Earn 200 lifetime stars.", test: (s) => s.repLife >= 200 },
  { id: "a_bug500", emoji: "🐛", name: "Exterminator", desc: "Squash 500 bugs by hand.", test: (s) => s.bugsKilled >= 500 },
  { id: "a_ev10", emoji: "🍀", name: "Right Place", desc: "Catch 10 opportunities.", test: (s) => s.events >= 10 },
  { id: "a_trk1", emoji: "🧭", name: "Found Your Thing", desc: "Choose a specialisation.", test: (s) => !!s.track },
  { id: "a_trk3", emoji: "🔀", name: "Career Changer", desc: "Earn mastery in three tracks.", test: (s) => countKeys(s.mastery) >= 3 },
  { id: "a_trkall", emoji: "🎒", name: "Tried Everything", desc: "Earn mastery in all seven tracks.", test: (s) => countKeys(s.mastery) >= 7 },
  { id: "a_mast5", emoji: "🥇", name: "True Specialist", desc: "Reach mastery 5 in one track.", test: (s) => Math.max(0, ...Object.values(s.mastery as Record<string, number>)) >= 5 },
];
