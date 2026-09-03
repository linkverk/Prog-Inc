/**
 * The sidebar (desktop) and bottom bar (mobile). One markup, two layouts: on a narrow
 * screen the first four unlocked pages sit in the bar and the rest fold behind "More".
 */

import type { PageId } from "../core/unlocks";
import { pageUnlocked } from "../core/unlocks";
import { $, esc } from "./dom";
import { view } from "./viewstore";
import { allPages, current, go } from "./router";

export type Badge = "dot" | "new" | null;

const badges = new Map<PageId, Badge>();
const MOBILE_SLOTS = 4;

export function setBadge(id: PageId, b: Badge): void {
  badges.set(id, b);
}

export function buildNav(): void {
  const host = $("navlist");
  host.innerHTML = allPages()
    .filter((p) => !p.hud)
    .map(
      (p) =>
        `<button class="navbtn" data-page="${p.id}" hidden>` +
        `<span class="ng">${esc(p.glyph)}</span><span class="nl">${esc(p.label)}</span>` +
        `<span class="nb"></span></button>`,
    )
    .join("");
  host.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-page]");
    if (!b) return;
    go(b.dataset.page as PageId);
    $("nav").classList.remove("open");
    b.blur();
  });
  $("navmore").addEventListener("click", () => $("nav").classList.toggle("open"));
}

export function paintNav(): void {
  const here = current();
  let slot = 0;
  let overflowBadge = false;
  for (const b of $("navlist").querySelectorAll<HTMLElement>("[data-page]")) {
    const id = b.dataset.page as PageId;
    const open = pageUnlocked(id);
    b.hidden = !open;
    if (!open) continue;
    const badge: Badge = !view.seen.includes(id) ? "new" : (badges.get(id) ?? null);
    b.classList.toggle("overflow", slot >= MOBILE_SLOTS);
    if (slot >= MOBILE_SLOTS && badge && id !== here) overflowBadge = true;
    slot++;
    b.setAttribute("aria-current", String(id === here));
    const nb = b.querySelector<HTMLElement>(".nb")!;
    nb.className = `nb${badge && id !== here ? ` ${badge}` : ""}`;
    nb.textContent = badge === "new" && id !== here ? "new" : "";
  }
  $("nav").classList.toggle("has-more", slot > MOBILE_SLOTS);
  $("navmore").classList.toggle("dot", overflowBadge);
}
