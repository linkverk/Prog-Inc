import type { GameState } from "./types";
import { migrate, newGame } from "./state";

const KEY = "zero10x.save.v3";

export function save(s: GameState): void {
  s.lastSave = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private window, quota, or storage disabled — play on, just do not persist */
  }
}

export function load(): { state: GameState; existed: boolean } {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (!raw) return { state: newGame(), existed: false };
  try {
    return { state: migrate(JSON.parse(raw) as Partial<GameState>), existed: true };
  } catch {
    return { state: newGame(), existed: false };
  }
}

export function wipe(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}

export function exportSave(s: GameState): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(s))));
}

export function importSave(text: string): GameState | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(escape(atob(text.trim())))) as Partial<GameState>;
    if (typeof parsed.totalLoc !== "number") return null;
    return migrate(parsed);
  } catch {
    return null;
  }
}
