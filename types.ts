import { D, S, faucetOnBugsAppear, faucetOnOpportunity, gainLoc, recompute, track } from "./engine";
import { fmt, money } from "./format";
import { log } from "./bus";

export interface Opportunity {
  id: string;
  emoji: string;
  name: string;
  sub: string;
  take: () => void;
}

function addBuff(id: string, emoji: string, name: string, mult: number, secs: number, kind: "loc" | "money" = "loc") {
  const now = Date.now();
  const existing = S.buffs.find((b) => b.id === id);
  if (existing) {
    existing.until = Math.max(existing.until, now) + secs * 1000;
    return;
  }
  S.buffs.push({ id, emoji, name, mult, kind, until: now + secs * 1000 });
}

export const OPPORTUNITIES: Opportunity[] = [
  { id: "flow", emoji: "🌊", name: "Flow state", sub: "×7 output for 30s", take: () => addBuff("flow", "🌊", "Flow state", 7, 30) },
  { id: "pair", emoji: "👥", name: "Perfect pairing", sub: "×4 output for 60s", take: () => addBuff("pair", "👥", "Pairing", 4, 60) },
  {
    id: "rec", emoji: "📨", name: "Recruiter in your inbox", sub: "Instant cash",
    take: () => {
      const g = Math.max(200, D.mps * 180);
      S.money += g;
      log(`Answered a recruiter. Counter-offer: ${money(g)}.`, "good");
    },
  },
  {
    id: "hack", emoji: "🏁", name: "Weekend hackathon", sub: "Instant lines",
    take: () => {
      const g = Math.max(100, D.lps * 240);
      gainLoc(g);
      log(`Hackathon shipped ${fmt(g)} lines in 48 hours.`, "good");
    },
  },
  {
    id: "ans", emoji: "💡", name: "You finally understood it", sub: "Instant knowledge",
    take: () => {
      const g = Math.max(3, D.kps * 600);
      S.kp += g;
      log(`Something clicked. +${fmt(g)} KP.`, "good");
    },
  },
  {
    id: "ref", emoji: "🧼", name: "Refactor weekend", sub: "Clears bugs, ×3 for 25s",
    take: () => {
      const before = S.bugs;
      S.bugs *= 0.15;
      S.bugsKilled += before - S.bugs;
      addBuff("ref", "🧼", "Refactor", 3, 25);
      log(`Refactor weekend closed ${fmt(before - S.bugs)} bugs.`, "good");
    },
  },
  {
    id: "viral", emoji: "🚀", name: "Your repo hit the front page", sub: "×6 income for 90s",
    take: () => addBuff("viral", "🚀", "Front page", 6, 90, "money"),
  },
];

let nextOpportunity = Date.now() + 75_000;
let nextIncident = Date.now() + 240_000;

export function dueOpportunity(): Opportunity | null {
  if (Date.now() < nextOpportunity) return null;
  scheduleOpportunity();
  return OPPORTUNITIES[Math.floor(Math.random() * OPPORTUNITIES.length)];
}

export function scheduleOpportunity(): void {
  const base = 95_000 + Math.random() * 115_000;
  nextOpportunity = Date.now() + base / Math.max(1, D.luck);
}

export function takeOpportunity(o: Opportunity): void {
  o.take();
  S.events++;
  faucetOnOpportunity();
  recompute();
}

/** Occasional bad news. For a Security Researcher it is good news. */
export function maybeIncident(): void {
  if (Date.now() < nextIncident) return;
  nextIncident = Date.now() + 200_000 + Math.random() * 300_000;
  if (D.lps <= 0) return;
  const burst = D.lps * 20 + 30;
  S.bugs += burst;
  S.bugsSeen += burst;
  faucetOnBugsAppear(burst);
  const bounty = track()?.sig === "bounty";
  log(
    bounty
      ? `Fresh disclosure dropped. ${fmt(burst)} findings to triage.`
      : `Production incident. ${fmt(burst)} bugs surfaced at once.`,
    bounty ? "good" : "bad",
  );
}
