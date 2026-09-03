/** Achievements: what you have, and how far off the rest are. */

import type { Achievement } from "../../core/types";
import type { Page } from "../router";
import { AWARD_BONUS, S } from "../../core/engine";
import { ACHIEVEMENTS } from "../../data/achievements";
import { fmt } from "../../core/format";
import { $, esc } from "../dom";

const HTML = `
<p class="hint">Each award earned adds <b id="ach-worth"></b> to all code output, forever.
<span id="ach-count" class="num"></span></p>
<div class="achbar"><b id="ach-fill"></b></div>
<div class="grid2" id="awards"></div>
`;

/**
 * Sections in the order a career runs into them. An award lands in the first section
 * whose prefix list matches its id, so adding one to `achievements.ts` needs no work
 * here unless it wants a heading of its own.
 */
const SECTIONS: [string, string[]][] = [
  ["Output", ["a_first", "a_k", "a_m", "a_b", "a_t", "a_qa", "a_qi", "a_sx", "a_run"]],
  ["By hand", ["a_c"]],
  ["Tools", ["a_g"]],
  ["Money", ["a_m1"]],
  ["Career", ["a_r", "a_hop", "a_rep", "a_trk", "a_mast"]],
  ["Upgrades", ["a_u"]],
  ["The tree", ["a_gate", "a_sub", "a_lv", "a_sk", "a_max", "a_t3", "a_t5", "a_t6", "a_t7", "a_cur"]],
  ["Bugs and luck", ["a_bug", "a_seen", "a_ev", "a_bounty"]],
  ["Knowledge", ["a_kp"]],
  ["Quietly difficult", ["a_secret"]],
];

/** Longest prefix wins, so `a_m1m` reads as Money rather than as a line count. */
function sectionOf(a: Achievement): string {
  let best = "";
  let bestLen = -1;
  for (const [name, prefixes] of SECTIONS) {
    for (const p of prefixes) {
      if (a.id.startsWith(p) && p.length > bestLen) {
        best = name;
        bestLen = p.length;
      }
    }
  }
  return best || "Other";
}

function card(a: Achievement): string {
  const got = !!S.ach[a.id];
  // a secret award gives nothing away until it is earned; everything else is a goal
  const hidden = !got && a.secret;
  const name = hidden ? "???" : a.name;
  const desc = hidden ? "Something you will only notice by doing it." : a.desc;

  let bar = "";
  if (!got && !hidden && a.progress) {
    const [now, goal] = a.progress(S);
    const fill = goal > 0 ? Math.max(0, Math.min(1, now / goal)) : 0;
    bar =
      `<div class="achp"><i><b style="width:${(fill * 100).toFixed(1)}%"></b></i>` +
      `<span>${esc(fmt(Math.min(now, goal)))} / ${esc(fmt(goal))}</span></div>`;
  }

  return (
    `<div class="ach${got ? " got" : ""}${hidden ? " secret" : ""}">` +
    `<span class="em">${a.emoji}</span>` +
    `<span class="achb"><div class="an">${esc(name)}</div>` +
    `<div class="ad">${esc(desc)}</div>${bar}</span></div>`
  );
}

function render(): void {
  const owned = Object.keys(S.ach).length;
  $("ach-count").textContent = `${owned} / ${ACHIEVEMENTS.length} earned`;
  $("ach-worth").textContent = `+${(AWARD_BONUS * 100).toFixed(1)}%`;
  ($("ach-fill") as HTMLElement).style.width =
    `${((owned / ACHIEVEMENTS.length) * 100).toFixed(1)}%`;

  const groups = new Map<string, Achievement[]>();
  for (const [name] of SECTIONS) groups.set(name, []);
  for (const a of ACHIEVEMENTS) {
    const key = sectionOf(a);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  let html = "";
  for (const [name, list] of groups) {
    if (!list.length) continue;
    const have = list.filter((a) => S.ach[a.id]).length;
    html +=
      `<h4 class="achh">${esc(name)} <span class="counthint">${have}/${list.length}</span></h4>` +
      list.map(card).join("");
  }
  $("awards").innerHTML = html;
}

export const page: Page = {
  id: "awards",
  label: "Awards",
  glyph: "★",
  html: HTML,
  init() {},
  render,
};
