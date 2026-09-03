/** Achievements. Each one earned is +1% output for the rest of the career. */

import type { Page } from "../router";
import { S } from "../../core/engine";
import { ACHIEVEMENTS } from "../../data/achievements";
import { $, esc } from "../dom";

const HTML = `
<p class="hint">Each award earned adds <b>+1%</b> to all code output, forever. <span id="ach-count" class="num"></span></p>
<div class="grid2" id="awards"></div>
`;

function render(): void {
  const owned = Object.keys(S.ach).length;
  $("ach-count").textContent = `${owned} / ${ACHIEVEMENTS.length} earned`;
  $("awards").innerHTML = ACHIEVEMENTS.map((a) => {
    const got = !!S.ach[a.id];
    return (
      `<div class="ach${got ? " got" : ""}"><span class="em">${a.emoji}</span>` +
      `<span><div class="an">${got ? esc(a.name) : "???"}</div><div class="ad">${esc(a.desc)}</div></span></div>`
    );
  }).join("");
}

export const page: Page = {
  id: "awards",
  label: "Awards",
  glyph: "★",
  html: HTML,
  init() {},
  render,
};
