import type { Upgrade } from "../core/types";
import { S, upgradeUnlocked, UPGRADE_BY_ID } from "../core/engine";
import { UPGRADES } from "../data/upgrades.generated";
import { buyUpgrade } from "../core/actions";
import { money } from "../core/format";
import { $, delegate, esc } from "./dom";

/** 450 upgrades is too many for one flat list — this is the filter that makes it usable. */
let query = "";
let family = "*";
let show: "avail" | "afford" | "owned" | "all" = "avail";
let onChange: () => void = () => {};

const FAMILY_LABELS: Record<string, string> = {
  generator: "Tools",
  output: "Output",
  income: "Income",
  click: "Clicking",
  quality: "Quality",
  knowledge: "Knowledge",
};

function familyLabel(f: string): string {
  if (FAMILY_LABELS[f]) return FAMILY_LABELS[f];
  const [kind, id] = f.split(":");
  const name = id.charAt(0).toUpperCase() + id.slice(1);
  return kind === "branch" ? `Branch · ${name}` : `Track · ${name}`;
}

export function initShop(changed: () => void): void {
  onChange = changed;

  const sel = $<HTMLSelectElement>("shop-family");
  const families = [...new Set(UPGRADES.map((u) => u.family))];
  sel.innerHTML =
    `<option value="*">All families</option>` +
    families.map((f) => `<option value="${f}">${familyLabel(f)}</option>`).join("");

  sel.addEventListener("change", () => {
    family = sel.value;
    renderShop();
  });
  $<HTMLSelectElement>("shop-show").addEventListener("change", (e) => {
    show = (e.target as HTMLSelectElement).value as typeof show;
    renderShop();
  });
  $<HTMLInputElement>("shop-q").addEventListener("input", (e) => {
    query = (e.target as HTMLInputElement).value.trim().toLowerCase();
    renderShop();
  });

  delegate($("shop"), "[data-upg]", (t) => {
    const u = UPGRADE_BY_ID[t.dataset.upg!];
    if (u && buyUpgrade(u) === "ok") {
      renderShop();
      onChange();
    }
  });
}

function visible(u: Upgrade): boolean {
  const owned = !!S.upg[u.id];
  if (family !== "*" && u.family !== family) return false;
  if (query && !(`${u.name} ${u.desc}`.toLowerCase().includes(query))) return false;
  switch (show) {
    case "owned": return owned;
    case "afford": return !owned && upgradeUnlocked(u) && S.money >= u.cost;
    case "avail": return !owned && upgradeUnlocked(u);
    case "all": return true;
  }
}

export function renderShop(): void {
  const host = $("shop");
  const list = UPGRADES.filter(visible).sort((a, b) => {
    const ao = S.upg[a.id] ? 1 : 0;
    const bo = S.upg[b.id] ? 1 : 0;
    if (ao !== bo) return ao - bo;
    return a.cost - b.cost;
  });

  const ownedTotal = Object.keys(S.upg).length;
  $("shop-count").textContent = `${list.length} shown · ${ownedTotal}/${UPGRADES.length} owned`;

  if (list.length === 0) {
    host.innerHTML = `<p class="hint">Nothing matches. Loosen the filter, or go and earn something.</p>`;
    return;
  }

  host.innerHTML = list
    .slice(0, 240)
    .map((u) => {
      const owned = !!S.upg[u.id];
      const open = upgradeUnlocked(u);
      const can = !owned && open && S.money >= u.cost;
      const cls = `item${owned ? " owned" : ""}${!open && !owned ? " locked" : ""}${can ? " afford" : ""}`;
      const badge = u.family.startsWith("track:")
        ? ' <span class="pill acc">track</span>'
        : u.family.startsWith("branch:")
          ? ' <span class="pill info">branch</span>'
          : "";
      return (
        `<button class="${cls}"${owned || !open ? "" : ` data-upg="${u.id}"`}>` +
        `<span class="glyph">${u.emoji}</span>` +
        `<span><span class="nm">${esc(u.name)}${badge}${owned ? ' <span class="pill ok">owned</span>' : ""}</span>` +
        `<span class="ds">${esc(u.desc)}</span>${
          !open && !owned ? `<span class="ds" style="color:var(--ink2)">${lockReason(u)}</span>` : ""
        }</span>` +
        (owned ? "" : `<span class="price"><span class="c ${can ? "ok" : "no"}">${money(u.cost)}</span></span>`) +
        `</button>`
      );
    })
    .join("");

  if (list.length > 240) {
    host.insertAdjacentHTML(
      "beforeend",
      `<p class="hint" style="grid-column:1/-1">…and ${list.length - 240} more. Narrow the filter to see them.</p>`,
    );
  }
}

function lockReason(u: Upgrade): string {
  const parts: string[] = [];
  if (u.reqRank !== undefined && S.rank < u.reqRank) parts.push(`rank ${u.reqRank + 1}`);
  if (u.reqClicks !== undefined && S.clicks < u.reqClicks) parts.push(`${u.reqClicks} manual lines`);
  if (u.reqBugsKilled !== undefined && S.bugsKilled < u.reqBugsKilled) parts.push(`${u.reqBugsKilled} bugs squashed`);
  if (u.reqGen) parts.push(`${u.reqGen[1]}× that tool`);
  if (u.reqBranch && !S.skills["b_" + u.reqBranch]) parts.push(`the ${u.reqBranch} branch`);
  if (u.reqTrack && S.track !== u.reqTrack) parts.push(`the ${u.reqTrack} specialisation`);
  return parts.length ? `Needs ${parts.join(" + ")}.` : "";
}
