import type { Perk } from "../core/types";

/** Bought with ★ reputation. Permanent — a job hop never takes these back. */
export const PERKS: Perk[] = [
  { id: "resume", emoji: "📄", name: "Résumé", desc: "Start every new run one rank higher.", max: 5, cost: (l) => 4 * 3 ** l },
  { id: "sever", emoji: "💰", name: "Severance Package", desc: "Start with a pile of cash.", max: 6, cost: (l) => 3 * 2.6 ** l },
  { id: "muscle", emoji: "⌨️", name: "Muscle Memory", desc: "+150% click power per level.", max: 8, cost: (l) => 2 * 2.2 ** l },
  { id: "vcs", emoji: "🌿", name: "Version Control", desc: "Keep 6% of every tool through a job hop.", max: 5, cost: (l) => 8 * 3 ** l },
  { id: "sleep", emoji: "🛌", name: "Sleep Schedule", desc: "+3h offline cap and +15% offline rate.", max: 5, cost: (l) => 5 * 2.4 ** l },
  { id: "clout", emoji: "📣", name: "Open Source Clout", desc: "+35% income per level.", max: 8, cost: (l) => 4 * 2.3 ** l },
  { id: "types", emoji: "🛡️", name: "Type Safety", desc: "Bugs appear 15% slower per level.", max: 6, cost: (l) => 6 * 2.4 ** l },
  { id: "mentor", emoji: "🧭", name: "Mentor Network", desc: "+40% knowledge gain per level.", max: 6, cost: (l) => 5 * 2.3 ** l },
  { id: "compound", emoji: "📈", name: "Compounding Interest", desc: "Each star is worth +40% more.", max: 8, cost: (l) => 12 * 2.6 ** l },
  { id: "transfer", emoji: "🔀", name: "Transferable Skills", desc: "+20% output per level while off-track.", max: 5, cost: (l) => 9 * 2.5 ** l },
  { id: "tenure", emoji: "🎟️", name: "Tenure", desc: "Keep 15% of every branch currency through a job hop.", max: 4, cost: (l) => 20 * 3 ** l },
  { id: "curious", emoji: "🔭", name: "Insatiable Curiosity", desc: "+25% to every branch currency per level.", max: 6, cost: (l) => 15 * 2.7 ** l },
];
