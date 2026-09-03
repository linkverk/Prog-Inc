import { $, el } from "./dom";

let root: HTMLElement | null = null;

function host(): HTMLElement {
  if (!root) root = $("modal-root");
  return root;
}

export function openModal(html: string, wide = false): HTMLElement {
  const h = host();
  h.innerHTML = "";
  const scrim = el("div", "scrim");
  const modal = el("div", "modal");
  if (wide) modal.style.maxWidth = "860px";
  modal.appendChild(el("div", "body", html));
  scrim.appendChild(modal);
  h.appendChild(scrim);
  scrim.addEventListener("click", (e) => {
    if (e.target === scrim) closeModal();
  });
  h.querySelector<HTMLElement>("[data-close]")?.addEventListener("click", closeModal);
  return modal;
}

export function closeModal(): void {
  host().innerHTML = "";
}

export const modalOpen = () => host().childElementCount > 0;
