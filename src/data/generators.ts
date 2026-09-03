import type { Generator } from "../core/types";

export const GENERATORS: Generator[] = [
  { id: "notepad", emoji: "📝", name: "Notepad Window", desc: "No autocomplete. Pure willpower.", cost: 10, rate: 0.25, machine: true },
  { id: "duck", emoji: "🦆", name: "Rubber Duck", desc: "Explains your bug back to you, silently.", cost: 120, rate: 1.4 },
  { id: "so", emoji: "📋", name: "Stack Overflow Tab", desc: "Answered in 2011, still correct.", cost: 1500, rate: 9 },
  { id: "ide", emoji: "🧩", name: "A Real IDE", desc: "Refactors, jumps to definition, judges you.", cost: 2.2e4, rate: 47, machine: true },
  { id: "snips", emoji: "📦", name: "Snippet Library", desc: "Your own greatest hits, one keystroke away.", cost: 2.8e5, rate: 260 },
  { id: "tests", emoji: "✅", name: "Test Suite", desc: "Writes confidence. Also closes bugs.", cost: 3.6e6, rate: 1400, clean: 0.01 },
  { id: "ci", emoji: "🔁", name: "CI/CD Pipeline", desc: "Green check marks while you sleep.", cost: 5e7, rate: 7800, clean: 0.014, machine: true },
  { id: "junior", emoji: "👤", name: "Junior Developer", desc: "Eager, fast, occasionally creative.", cost: 7e8, rate: 4.4e4 },
  { id: "oss", emoji: "🌐", name: "OSS Contributors", desc: "Strangers improving your repo for free.", cost: 1.2e10, rate: 2.6e5 },
  { id: "pair", emoji: "🤖", name: "AI Pair Programmer", desc: "Never tired, never right the first time.", cost: 1.9e11, rate: 1.6e6, clean: 0.02, machine: true },
  { id: "farm", emoji: "🏭", name: "Distributed Build Farm", desc: "Ten thousand cores, one Makefile.", cost: 2.9e12, rate: 1.05e7, machine: true },
  { id: "swarm", emoji: "🌌", name: "Autonomous Agent Swarm", desc: "You describe the system. It appears.", cost: 4.4e13, rate: 6.6e7, clean: 0.03, machine: true },
];

export const GROWTH = 1.15;
export const MACHINE_IDS = GENERATORS.filter((g) => g.machine).map((g) => g.id);
export const GEN_BY_ID: Record<string, Generator> = Object.fromEntries(GENERATORS.map((g) => [g.id, g]));
