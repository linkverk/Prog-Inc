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
  { id: "spec", emoji: "📜", name: "Executable Specification", desc: "Written once, in prose the compiler accepts.", cost: 6.8e14, rate: 4.2e8 },
  { id: "synth", emoji: "⚗️", name: "Program Synthesiser", desc: "State the property. Collect the implementation.", cost: 1.05e16, rate: 2.7e9, machine: true },
  { id: "fleet", emoji: "🛠️", name: "Self-Healing Fleet", desc: "Notices the outage, fixes it, files the report.", cost: 1.6e17, rate: 1.7e10, clean: 0.035, machine: true },
  { id: "campus", emoji: "🏛️", name: "Research Campus", desc: "Two thousand people, all reading your issues.", cost: 2.5e18, rate: 1.1e11 },
  { id: "foundry", emoji: "🔬", name: "Silicon Foundry", desc: "When the bottleneck is physics, change the physics.", cost: 3.9e19, rate: 7e11, machine: true },
  { id: "orbital", emoji: "🛰️", name: "Orbital Data Centre", desc: "Cooling is free up there. So is the sunlight.", cost: 6e20, rate: 4.4e12, machine: true },
  { id: "civ", emoji: "🌍", name: "Civilisation-Scale Compiler", desc: "Every idle cycle on the planet, pointed at your build.", cost: 9.3e21, rate: 2.8e13, clean: 0.04, machine: true },
  { id: "singular", emoji: "✴️", name: "The Singularity Intern", desc: "Still asks where the coffee is. Ships everything else.", cost: 1.45e23, rate: 1.8e14, machine: true },
];

export const GROWTH = 1.15;
export const MACHINE_IDS = GENERATORS.filter((g) => g.machine).map((g) => g.id);
export const GEN_BY_ID: Record<string, Generator> = Object.fromEntries(GENERATORS.map((g) => [g.id, g]));
