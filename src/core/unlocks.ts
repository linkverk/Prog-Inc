/**
 * Which pages of the game the player has earned.
 *
 * Pure functions of state: nothing here is stored in the save, so a page can never be
 * "lost" and an old save opens with everything it has already reached. The UI reads these
 * once a second and turns a newly true rule into a log line and a badge.
 */

import { D, S, SKILL_BY_ID } from "./engine";
import { skillCost } from "./effects";
import { GENERATORS } from "../data/generators";

export type PageId =
  | "desk"
  | "tools"
  | "skills"
  | "career"
  | "awards"
  | "hop"
  | "stats"
  | "settings";

/** Sidebar order. `settings` is reached from the HUD gear, not the sidebar. */
export const PAGE_IDS: PageId[] = ["desk", "tools", "skills", "career", "awards", "hop", "stats", "settings"];

const anyOwned = (o: Record<string, number>): boolean => Object.keys(o).length > 0;

/**
 * The pacing of the first ten minutes lives here. Each rule is written so that it is
 * true at the moment the page first has something to do — not before, and not after
 * the player has already needed it.
 */
export function pageUnlocked(id: PageId): boolean {
  switch (id) {
    case "desk":
    case "settings":
      return true;
    case "tools":
      // the first tool is affordable, or one was ever bought
      return anyOwned(S.gens) || S.money >= (D.genCost[GENERATORS[0].id] ?? GENERATORS[0].cost);
    case "skills":
      // the first gateway is within reach, or the ladder has started moving
      return anyOwned(S.skills) || S.rank >= 1 || S.kp >= skillCost(SKILL_BY_ID.g0, 0);
    case "career":
      return S.rank >= 1;
    case "awards":
      return anyOwned(S.ach);
    case "hop":
      // shown early enough to be a goal; the button itself still needs 20M lines
      return S.hops > 0 || S.repLife > 0 || S.runLoc >= 1e6;
    case "stats":
      return S.totalLoc >= 1000;
  }
}

export function unlockedPages(): PageId[] {
  return PAGE_IDS.filter(pageUnlocked);
}
