/**
 * Everything the UI remembers that is not part of the run: which page is open, which
 * folds of the map are open, which edge families are drawn, node density, badges seen.
 *
 * Kept in its own localStorage key so `zero10x.save.v3` never needs a migration for a
 * preference. Losing this file costs the player nothing but a view.
 */

import type { Density } from "./tree";
import type { PageId } from "../core/unlocks";

const VIEW_KEY = "zero10x.view.v1";

/** "earned" hides what you have not reached yet; "all" is the spoiler-friendly map. */
export type Reveal = "earned" | "all";

export interface ViewState {
  mode: "web" | "layers";
  reveal: Reveal;
  open: string[];
  families: string[];
  density: Density;
  page: PageId;
  /** pages whose "new" badge has been cleared by a visit */
  seen: PageId[];
}

const defaults: ViewState = {
  mode: "web",
  reveal: "earned",
  open: [],
  families: [],
  density: "tight",
  page: "desk",
  seen: ["desk"],
};

function load(): ViewState {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    if (!raw) return { ...defaults };
    const p = JSON.parse(raw) as Partial<ViewState>;
    return {
      mode: p.mode === "layers" ? "layers" : "web",
      reveal: p.reveal === "all" ? "all" : "earned",
      open: Array.isArray(p.open) ? p.open : [...defaults.open],
      families: Array.isArray(p.families) ? p.families : [...defaults.families],
      density: p.density === "normal" ? "normal" : "tight",
      page: typeof p.page === "string" ? p.page : defaults.page,
      seen: Array.isArray(p.seen) ? p.seen : [...defaults.seen],
    };
  } catch {
    return { ...defaults };
  }
}

/** Live, mutable. Change a field, then call `persistView()`. */
export const view: ViewState = load();

/** True when nothing was stored yet — the caller may want to seed the tree defaults. */
export const viewIsFresh = ((): boolean => {
  try {
    return localStorage.getItem(VIEW_KEY) === null;
  } catch {
    return true;
  }
})();

export function persistView(): void {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(view));
  } catch {
    /* private window or storage disabled — the game still works, it just forgets */
  }
}
