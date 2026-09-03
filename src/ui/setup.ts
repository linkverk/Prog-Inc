import { D, S, bulkCost, bulkCount } from "../core/engine";
import { GENERATORS } from "../data/generators";
import { buyGenerator } from "../core/actions";
import { fmt, money } from "../core/format";
import { $, delegate, el } from "./dom";

interface Row {
  root: HTMLElement;
  count: HTMLElement;
  price: HTMLElement;
  own: HTMLElement;
  rate: HTMLElement;
}

const rows: Record<string, Row> = {};

export function initSetup(onChange: () => void): void {
  const host = $("gens");
  host.innerHTML = "";
  for (const g of GENERATORS) {
    const root = el("button", "item");
    root.dataset.gen = g.id;
    root.innerHTML =
      `<span class="glyph">${g.emoji}</span>` +
      `<span><span class="nm">${g.name} <span class="count" data-c></span></span>` +
      `<span class="ds">${g.desc}</span><span class="rt" data-r></span></span>` +
      `<span class="price"><span class="c" data-p></span><span class="own" data-o></span></span>`;
    host.appendChild(root);
    rows[g.id] = {
      root,
      count: root.querySelector("[data-c]")!,
      price: root.querySelector("[data-p]")!,
      own: root.querySelector("[data-o]")!,
      rate: root.querySelector("[data-r]")!,
    };
  }

  delegate(host, "[data-gen]", (t) => {
    if (buyGenerator(t.dataset.gen!) === "ok") onChange();
  });

  const bulkButtons = document.querySelectorAll<HTMLElement>("[data-bulk]");
  bulkButtons.forEach((b) => {
    b.setAttribute(
      "aria-pressed",
      String((S.bulk === "max" ? "max" : String(S.bulk)) === b.dataset.bulk),
    );
    b.addEventListener("click", () => {
      const v = b.dataset.bulk!;
      S.bulk = v === "max" ? "max" : Number.parseInt(v, 10);
      bulkButtons.forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
      refreshSetup();
    });
  });
}

export function refreshSetup(): void {
  GENERATORS.forEach((g, idx) => {
    const r = rows[g.id];
    if (!r) return;
    const owned = S.gens[g.id] ?? 0;
    const prevOwned = idx === 0 ? 1 : (S.gens[GENERATORS[idx - 1].id] ?? 0);
    const visible = owned > 0 || idx === 0 || prevOwned > 0 || S.money >= D.genCost[g.id] * 0.35;
    r.root.style.display = visible ? "" : "none";
    if (!visible) return;

    const k = Math.max(1, bulkCount(g.id));
    const cost = bulkCost(g.id, k);
    r.count.textContent = String(owned);
    r.count.style.display = owned > 0 ? "" : "none";
    r.price.textContent = money(cost) + (k > 1 ? ` · ×${k}` : "");
    r.price.className = `c ${S.money >= cost ? "ok" : "no"}`;
    r.root.className = `item${S.money >= cost ? " afford" : ""}`;
    r.own.textContent = owned > 0 ? `${fmt(owned * D.genRate[g.id] * D.all)} LOC/s` : "";
    r.rate.textContent = `+${fmt(D.genRate[g.id] * D.all)} LOC/s each`;
  });
}
