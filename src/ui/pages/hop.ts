/** Prestige: hand in your notice, keep the stars, spend them on things no reset can take. */

import type { Page, PageCtx } from "../router";
import { S, mastery, masteryGain, perk, repGain, track } from "../../core/engine";
import { RANKS, PICK_RANK } from "../../data/ranks";
import { PERKS } from "../../data/perks";
import { BRANCHES } from "../../data/branches";
import { jobHop } from "../../core/actions";
import { fmt } from "../../core/format";
import { $, delegate, esc } from "../dom";
import { closeModal, openModal } from "../modal";
import { offerTrack } from "./career";

let ctx: PageCtx = { changed: () => {}, progress: () => {} };

const HTML = `<div id="reset-body"></div>`;

function render(): void {
  const stars = repGain();
  const m = masteryGain();
  const t = track();
  const starWorth = (5 * (1 + 0.4 * perk("compound"))).toFixed(1);

  const kept = BRANCHES.filter((b) => S.cur[b.id] > 0)
    .map((b) => `${fmt(S.cur[b.id])} ${b.sym}`)
    .join(" · ");

  let h =
    `<p class="hint">Leaving a job resets your lines, cash, tools, upgrades, skills, branch currencies and track — but the industry remembers you. ` +
    `Stars are permanent: each adds <b>+${starWorth}%</b> to output and pay in every future run. Hopping is also the only way to change specialisation.</p>`;

  h +=
    `<div class="panel" style="box-shadow:none;margin-bottom:14px"><div class="panel-b">` +
    `<div class="kv"><span>Lines this run</span><span>${fmt(S.runLoc)}</span></div>` +
    `<div class="kv"><span>Stars on hand</span><span>${fmt(S.rep)} ★</span></div>` +
    `<div class="kv"><span>Lifetime stars</span><span>${fmt(S.repLife)} ★</span></div>` +
    `<div class="kv"><span>Stars if you hop now</span><span style="color:var(--accent)">+${stars} ★</span></div>` +
    (t ? `<div class="kv"><span>${t.name} mastery</span><span style="color:var(--accent)">${mastery(t.id)} &rarr; ${mastery(t.id) + m}</span></div>` : "") +
    (kept ? `<div class="kv"><span>Branch currencies held</span><span>${kept}</span></div>` : "") +
    `</div><div class="subrow" style="border-top:1px solid var(--line-soft)">` +
    `<div><div style="font-weight:600;font-size:13px">Hand in your notice</div>` +
    `<div style="font-size:11.5px;color:var(--ink3)">${stars > 0 ? "You have enough to make the move worth it." : "Needs at least 20M lines this run."}</div></div>` +
    `<button class="minibtn danger" id="btn-hop"${stars > 0 ? "" : " disabled"}>Job hop</button></div></div>`;

  h += `<p class="hint">Spend stars on things no reset can take away.</p><div class="grid2">`;
  for (const p of PERKS) {
    const lvl = perk(p.id);
    const maxed = lvl >= p.max;
    const cost = Math.ceil(p.cost(lvl));
    const can = !maxed && S.rep >= cost;
    h +=
      `<button class="item${maxed ? " owned" : ""}${can ? " afford" : ""}"${maxed ? "" : ` data-perk="${p.id}"`}>` +
      `<span class="glyph">${p.emoji}</span>` +
      `<span><span class="nm">${p.name} <span class="count">${lvl}/${p.max}</span></span>` +
      `<span class="ds">${esc(p.desc)}</span></span>` +
      `<span class="price"><span class="c ${can ? "ok" : "no"}">${maxed ? "max" : `${fmt(cost)} ★`}</span></span></button>`;
  }
  h += `</div>`;
  $("reset-body").innerHTML = h;
}

function confirmHop(): void {
  const stars = repGain();
  const m = masteryGain();
  const t = track();
  openModal(
    `<h3>Hand in your notice?</h3>` +
      `<p>You keep your awards, your stars, your perks and every point of track mastery. ` +
      `You lose your lines, cash, tools, upgrades, skills, branch currencies, rank and current track.</p>` +
      `<div class="kv"><span>Reputation earned</span><span style="color:var(--accent)">+${stars} ★</span></div>` +
      (t ? `<div class="kv"><span>${t.name} mastery</span><span style="color:var(--accent)">+${m}</span></div>` : "") +
      `<div class="kv"><span>Starting rank next run</span><span>${RANKS[Math.min(perk("resume"), RANKS.length - 1)].name}</span></div>` +
      `<div class="kv"><span>Tools carried over</span><span>${perk("vcs") > 0 ? `${6 * perk("vcs")}%` : "none"}</span></div>` +
      `<div class="kv"><span>Branch currency carried over</span><span>${perk("tenure") > 0 ? `${15 * perk("tenure")}%` : "none"}</span></div>` +
      `<div class="actions" style="margin-top:16px"><button class="btn ghost" data-close>Stay</button>` +
      `<button class="btn" id="m-hop">Quit and move on</button></div>`,
  );
  $("m-hop").addEventListener("click", () => {
    if (jobHop()) {
      closeModal();
      render();
      ctx.changed();
      if (S.rank >= PICK_RANK) setTimeout(offerTrack, 320);
    }
  });
}

export const page: Page = {
  id: "hop",
  label: "Job Hop",
  glyph: "⇄",
  html: HTML,
  init(c) {
    ctx = c;
    delegate($("reset-body"), "[data-perk]", (t) => {
      const p = PERKS.find((x) => x.id === t.dataset.perk);
      if (!p) return;
      const lvl = perk(p.id);
      const cost = Math.ceil(p.cost(lvl));
      if (lvl >= p.max || S.rep < cost) return;
      S.rep -= cost;
      S.perks[p.id] = lvl + 1;
      render();
      ctx.changed();
    });
    delegate($("reset-body"), "#btn-hop", () => confirmHop());
  },
  render,
};
