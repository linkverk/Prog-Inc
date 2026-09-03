/**
 * Pages. Every page is mounted once at boot and toggled with `hidden`, so the ids the
 * status bar paints every tick are always there. Only the active page repaints on the
 * periodic tick. The URL hash mirrors the page for back/forward and deep links.
 */

import type { PageId } from "../core/unlocks";
import { PAGE_IDS, pageUnlocked } from "../core/unlocks";
import { $ } from "./dom";
import { persistView, view } from "./viewstore";
import { paintNav } from "./nav";

export interface PageCtx {
  /** something was bought or changed: repaint the HUD and badges */
  changed(): void;
  /** a click-driven gain: run rank and award checks, then repaint */
  progress(): void;
}

export interface Page {
  id: PageId;
  label: string;
  /** a game glyph, the same class of symbol as the currencies */
  glyph: string;
  html: string;
  init(ctx: PageCtx): void;
  render(): void;
  /** true when the page is a HUD destination rather than a sidebar entry */
  hud?: boolean;
}

const pages = new Map<PageId, Page>();
let active: PageId = "desk";
let booted = false;

export const current = (): PageId => active;
export const pageOf = (id: PageId): Page | undefined => pages.get(id);
export const allPages = (): Page[] => PAGE_IDS.map((id) => pages.get(id)).filter((p): p is Page => !!p);

export function mountPages(list: Page[], ctx: PageCtx): void {
  const host = $("pages");
  for (const p of list) {
    pages.set(p.id, p);
    const s = document.createElement("section");
    s.className = "page";
    s.id = `page-${p.id}`;
    s.hidden = true;
    s.innerHTML = p.html;
    host.appendChild(s);
  }
  for (const p of list) p.init(ctx);

  window.addEventListener("hashchange", () => {
    const id = fromHash();
    if (id && id !== active) go(id, false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.target !== document.body || e.altKey || e.ctrlKey || e.metaKey) return;
    const n = Number(e.key);
    if (!(n >= 1 && n <= 9)) return;
    const open = allPages().filter((p) => !p.hud && pageUnlocked(p.id));
    const p = open[n - 1];
    if (p) go(p.id);
  });

  booted = true;
  go(fromHash() ?? view.page, false);
}

function fromHash(): PageId | null {
  const m = /^#\/([a-z]+)$/.exec(location.hash);
  const id = m?.[1] as PageId | undefined;
  return id && pages.has(id) ? id : null;
}

/** Switch page. Locked pages fall back to the desk. */
export function go(id: PageId, pushHash = true): void {
  if (!booted) return;
  const target = pages.has(id) && pageUnlocked(id) ? id : "desk";
  for (const p of pages.values()) $(`page-${p.id}`).hidden = p.id !== target;
  active = target;
  if (!view.seen.includes(target)) view.seen.push(target);
  view.page = target;
  persistView();
  if (pushHash && location.hash !== `#/${target}`) history.replaceState(null, "", `#/${target}`);
  $("dock").hidden = target === "desk";
  pages.get(target)!.render();
  paintNav();
  window.scrollTo({ top: 0 });
}

export function renderActive(): void {
  pages.get(active)?.render();
}
