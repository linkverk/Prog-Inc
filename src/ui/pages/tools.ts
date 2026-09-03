/**
 * The flat shop for the twelve generators: the classic idle list. The same nodes exist
 * on the Skills tree; this page is a second view of them for the first hour, when
 * buying a Notepad and then a Duck is the whole game.
 */

import type { Page, PageCtx } from "../router";
import type { NodeSpec } from "../treemodel";
import {
  affordableLevels, buyNode, genSpec, lockReason, register, specById, statusOf, tiersOf,
  unlocked, upgradeSpec,
} from "../treemodel";
import { D, S, UPGRADE_BY_ID } from "../../core/engine";
import { GENERATORS } from "../../data/generators";
import { fmt, money } from "../../core/format";
import { $, delegate, esc } from "../dom";

let ctx: PageCtx = { changed: () => {}, progress: () => {} };

const HTML = `
<p class="hint">Everything that writes code while you are away from the keyboard. Each purchase costs
more than the last; every tool has eight upgrade tiers that unlock as you own more of it.</p>
<div class="toolhead"><span class="counthint" id="tools-sum"></span></div>
<div class="list" id="tools-list"></div>
`;

/** Specs are registered once so the ids resolve through `specById`, exactly as on the tree. */
const specOf = (gid: string): NodeSpec => specById(`gen:${gid}`) ?? register(genSpec(gid));

const tierSpec = (uid: string, gid: string, threshold: number): NodeSpec =>
  specById(`up:${uid}`) ?? register(upgradeSpec(UPGRADE_BY_ID[uid], [`gen:${gid}`], threshold));

/**
 * How a tier upgrade reads before it is bought.
 * Locked: the count it waits for, dimmed. Open: its price, clickable. Owned: a check.
 */
function tierChip(spec: NodeSpec, threshold: number): string {
  const st = statusOf(spec);
  const title = esc(spec.desc);
  if (st.maxed) return `<span class="tier owned" title="${title}">&#10003; ${esc(spec.name)}</span>`;
  if (!st.unlocked) return `<span class="tier locked" title="${title}">&times;${threshold} ${esc(spec.name)}</span>`;
  return (
    `<button class="tier${st.ready ? " ready" : ""}" data-buy="${spec.id}" data-n="1" title="${title}"` +
    `${st.ready ? "" : " disabled"}>${esc(spec.name)} <b>${money(UPGRADE_BY_ID[spec.key].cost)}</b></button>`
  );
}

function row(gid: string): string {
  const g = GENERATORS.find((x) => x.id === gid)!;
  const spec = specOf(gid);
  const st = statusOf(spec);
  const owned = st.level;
  const open = unlocked(spec);
  const each = D.genRate[gid] * D.all;
  const tiers = tiersOf(gid)
    .map((u) => tierChip(tierSpec(u.id, gid, u.reqGen?.[1] ?? 1), u.reqGen?.[1] ?? 1))
    .join("");
  const cls = `tool${st.ready ? " afford" : ""}${open ? "" : " locked"}${owned > 0 ? " have" : ""}`;
  const btn = (n: string, label: string, on: boolean) =>
    `<button data-buy="${spec.id}" data-n="${n}"${on ? "" : " disabled"}>${label}</button>`;
  return (
    `<div class="${cls}">` +
    `<span class="glyph">${g.emoji}</span>` +
    `<span class="tbody"><span class="nm">${esc(g.name)}${owned > 0 ? ` <span class="count">&times;${fmt(owned)}</span>` : ""}</span>` +
    `<span class="ds">${esc(g.desc)}</span>` +
    `<span class="rt">+${fmt(each)} LOC/s each${owned > 0 ? ` &middot; ${fmt(owned * each)} LOC/s from these` : ""}</span>` +
    (open ? `<span class="tiers">${tiers}</span>` : `<span class="rt">${esc(lockReason(spec))}</span>`) +
    `</span>` +
    `<span class="price"><span class="c ${st.ready ? "ok" : "no"}">${money(D.genCost[gid] ?? g.cost)}</span>` +
    `<span class="buyrow">${btn("1", "&times;1", st.ready)}${btn("10", "&times;10", affordableLevels(spec, 10) > 1)}${btn("max", "Max", affordableLevels(spec, 1000) > 1)}</span></span>` +
    `</div>`
  );
}

function render(): void {
  const total = GENERATORS.reduce((a, g) => a + (S.gens[g.id] ?? 0), 0);
  $("tools-sum").textContent = `${fmt(total)} tools · +${fmt(D.lps)} LOC/s · ${money(S.money)} in the bank`;
  $("tools-list").innerHTML = GENERATORS.map((g) => row(g.id)).join("");
}

export const page: Page = {
  id: "tools",
  label: "Tools",
  glyph: "⚙",
  html: HTML,
  init(c) {
    ctx = c;
    delegate($("tools-list"), "[data-buy]", (t) => {
      const spec = specById(t.dataset.buy!);
      if (!spec) return;
      const raw = t.dataset.n ?? "1";
      if (buyNode(spec, raw === "max" ? "max" : Number(raw)) > 0) {
        render();
        ctx.changed();
      }
    });
  },
  render,
};
