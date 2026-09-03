export function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`missing element #${id}`);
  return e as T;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  html?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

/** Delegated click handler — one listener per container, survives innerHTML rewrites. */
export function delegate(
  root: HTMLElement,
  selector: string,
  handler: (target: HTMLElement, ev: MouseEvent) => void,
): void {
  root.addEventListener("click", (ev) => {
    const t = (ev.target as HTMLElement | null)?.closest(selector) as HTMLElement | null;
    if (t && root.contains(t)) handler(t, ev as MouseEvent);
  });
}

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
