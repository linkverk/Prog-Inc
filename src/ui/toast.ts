import { $, el } from "./dom";

const MAX = 4;
const LIFE = 4000;

/**
 * A short notice that survives a page switch. The commit log still gets everything;
 * this is for the handful of events a player should not miss while shopping.
 */
export function toast(text: string, cls = ""): void {
  const host = $("toasts");
  const t = el("div", `toast ${cls}`.trim(), text);
  host.appendChild(t);
  while (host.children.length > MAX) host.removeChild(host.firstChild!);
  setTimeout(() => {
    t.classList.add("out");
    setTimeout(() => t.remove(), 300);
  }, LIFE);
}
