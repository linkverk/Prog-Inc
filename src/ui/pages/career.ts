/** The ladder and the seven ways to climb it: ranks, specialisations, mastery. */

import type { Page, PageCtx } from "../router";
import type { TrackId } from "../../core/types";
import { S, mastery, perk, rankName, track } from "../../core/engine";
import { RANKS, PICK_RANK } from "../../data/ranks";
import { TRACKS, TRACK_BY_ID } from "../../data/tracks";
import { chooseTrack } from "../../core/actions";
import { fmt } from "../../core/format";
import { $, esc } from "../dom";
import { closeModal, openModal } from "../modal";

let ctx: PageCtx = { changed: () => {}, progress: () => {} };

const HTML = `
<div id="track-body"></div>
<h3 class="pagesub">The ladder</h3>
<p class="hint">Every promotion multiplies pay and output permanently &mdash; for this run.</p>
<div class="list" id="ranks"></div>
`;

function trackCard(id: TrackId, pickable: boolean, current: boolean): string {
  const k = TRACK_BY_ID[id];
  const m = mastery(id);
  return (
    `<button class="tcard${current ? " cur" : ""}"${pickable ? ` data-track="${id}"` : ' disabled style="cursor:default"'}>` +
    `<div class="th"><span class="te">${k.emoji}</span><span class="tn">${k.name}</span>` +
    (current ? '<span class="pill acc">current</span>' : "") +
    `</div><div class="tt">${esc(k.sub)}</div>` +
    `<ul><li>${k.bullets.map(esc).join("</li><li>")}</li></ul>` +
    `<div class="tm"><span>${m ? `mastery <b>${m}</b> · +${m * 30}% here` : "no mastery yet"}</span>` +
    `<span>${pickable ? "choose" : current ? "active" : "locked this run"}</span></div></button>`
  );
}

function renderTrack(): void {
  const t = track();
  const pickable = !t && S.rank >= PICK_RANK;
  let h = t
    ? `<p class="hint">You are a <b>${t.name}</b> for the rest of this run. A job hop is what frees you to try another track — and each hop deepens the mastery of the one you just left.</p>`
    : pickable
      ? `<p class="hint">Pick one. It reshapes your ladder and changes how you earn.</p>`
      : `<p class="hint">You specialise at rank ${PICK_RANK + 1} (${RANKS[PICK_RANK].name}). Here is what is waiting.</p>`;

  h += `<div class="trackgrid">${TRACKS.map((k) => trackCard(k.id, pickable, t?.id === k.id)).join("")}</div>`;

  const total = Object.values(S.mastery).reduce((a, b) => a + (b ?? 0), 0);
  if (total > 0) {
    const bonus = (total * 3 * (1 + 0.2 * perk("transfer"))).toFixed(0);
    h += `<p class="hint" style="margin-top:12px">Total mastery <b>${total}</b> across all tracks — worth <b>+${bonus}%</b> output no matter which track you play.</p>`;
  }
  $("track-body").innerHTML = h;
}

function renderCareer(): void {
  const host = $("ranks");
  const t = track();
  host.innerHTML = RANKS.map((r, i) => {
    const reached = S.rank >= i;
    const current = S.rank === i;
    return (
      `<div class="item${reached ? " owned" : " locked"}" style="cursor:default">` +
      `<span class="glyph">${reached ? "✓" : i + 1}</span>` +
      `<span><span class="nm">${esc(rankName(i))}` +
      (current ? ' <span class="pill acc">you are here</span>' : "") +
      (i === PICK_RANK && !t ? ' <span class="pill info">specialise here</span>' : "") +
      `</span><span class="ds">${esc(r.note)}</span></span>` +
      `<span class="price"><span class="c ${reached ? "ok" : "no"}">${i === 0 ? "start" : fmt(r.req)}</span>` +
      `<span class="own">${i === 0 ? "" : "lines"}</span></span></div>`
    );
  }).join("");
}

/** The pick-a-track modal, offered the moment the rank is reached. */
export function offerTrack(): void {
  if (S.track) return;
  const cards = TRACKS.map((k) => trackCard(k.id, true, false)).join("");
  openModal(
    `<h3>Pick your specialisation</h3><p>From here your ladder and the way you earn both change shape. ` +
      `You keep this track for the rest of the run — a job hop is what lets you try another one.</p>` +
      `<div class="trackgrid">${cards}</div>` +
      `<div class="actions" style="margin-top:16px"><button class="btn ghost" id="m-later">Decide later</button></div>`,
    true,
  );
  $("m-later").addEventListener("click", () => {
    S.trackDeferred = true;
    closeModal();
  });
}

export const page: Page = {
  id: "career",
  label: "Career",
  glyph: "▲",
  html: HTML,
  init(c) {
    ctx = c;
    // one global handler covers this page and the choose-a-track modal
    document.addEventListener("click", (ev) => {
      const t = (ev.target as HTMLElement | null)?.closest("[data-track]") as HTMLElement | null;
      if (t && !S.track) {
        chooseTrack(t.dataset.track as TrackId);
        closeModal();
        render();
        ctx.changed();
      }
    });
  },
  render,
};

function render(): void {
  renderTrack();
  renderCareer();
}
