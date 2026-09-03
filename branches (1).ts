import type { TrackId } from "../core/types";
import { D, S, mastery, masteryGain, perk, rankName, repGain, track } from "../core/engine";
import { RANKS, PICK_RANK } from "../data/ranks";
import { TRACKS, TRACK_BY_ID } from "../data/tracks";
import { ACHIEVEMENTS } from "../data/achievements";
import { PERKS } from "../data/perks";
import { BRANCHES } from "../data/branches";
import { chooseTrack, jobHop } from "../core/actions";
import { fmt, money } from "../core/format";
import { $, delegate, esc } from "./dom";
import { closeModal, openModal } from "./modal";

let refresh: () => void = () => {};

export function initPanels(onChange: () => void): void {
  refresh = onChange;

  // one delegated handler covers the track tab and the choose-a-track modal
  document.addEventListener("click", (ev) => {
    const t = (ev.target as HTMLElement | null)?.closest("[data-track]") as HTMLElement | null;
    if (t && !S.track) {
      chooseTrack(t.dataset.track as TrackId);
      closeModal();
      refresh();
    }
  });

  delegate($("reset-body"), "[data-perk]", (t) => {
    const p = PERKS.find((x) => x.id === t.dataset.perk);
    if (!p) return;
    const lvl = perk(p.id);
    const cost = Math.ceil(p.cost(lvl));
    if (lvl >= p.max || S.rep < cost) return;
    S.rep -= cost;
    S.perks[p.id] = lvl + 1;
    refresh();
    renderPrestige();
  });

  delegate($("reset-body"), "#btn-hop", () => confirmHop());
}

/* ---------------- career ---------------- */

export function renderCareer(): void {
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

/* ---------------- awards ---------------- */

export function renderAwards(): void {
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

/* ---------------- track ---------------- */

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

export function renderTrack(): void {
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

/* ---------------- prestige ---------------- */

export function renderPrestige(): void {
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
      refresh();
      if (S.rank >= PICK_RANK) setTimeout(offerTrack, 320);
    }
  });
}

/* ---------------- career stats ---------------- */

export function openStats(): void {
  const mins = Math.floor((Date.now() - S.started) / 60000);
  const t = track();
  const masteryRows = TRACKS.filter((k) => mastery(k.id) > 0)
    .map((k) => `<div class="kv"><span>${k.emoji} ${k.name}</span><span>mastery ${mastery(k.id)}</span></div>`)
    .join("");
  const curRows = BRANCHES.filter((b) => S.curLife[b.id] > 0)
    .map((b) => `<div class="kv"><span>${b.sym} ${b.curName}</span><span>${fmt(S.cur[b.id])} held · ${fmt(S.curLife[b.id])} earned</span></div>`)
    .join("");

  openModal(
    `<h3>Career stats</h3>` +
      `<div class="kv"><span>Specialisation</span><span>${t ? t.name : "none yet"}</span></div>` +
      `<div class="kv"><span>Lines this run</span><span>${fmt(S.runLoc)}</span></div>` +
      `<div class="kv"><span>Lines all time</span><span>${fmt(S.totalLoc)}</span></div>` +
      `<div class="kv"><span>Lines typed by hand</span><span>${fmt(S.clicks)}</span></div>` +
      `<div class="kv"><span>Bugs squashed</span><span>${fmt(S.bugsKilled)}</span></div>` +
      `<div class="kv"><span>Opportunities caught</span><span>${fmt(S.events)}</span></div>` +
      `<div class="kv"><span>Job hops</span><span>${fmt(S.hops)}</span></div>` +
      `<div class="kv"><span>Skill levels owned</span><span>${fmt(Object.values(S.skills).reduce((a, b) => a + b, 0))}</span></div>` +
      `<div class="kv"><span>Upgrades owned</span><span>${Object.keys(S.upg).length}</span></div>` +
      `<div class="kv"><span>Global output multiplier</span><span>×${fmt(D.all)}</span></div>` +
      `<div class="kv"><span>Income multiplier</span><span>×${fmt(D.moneyM)}</span></div>` +
      `<div class="kv"><span>Time in career</span><span>${mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`}</span></div>` +
      (curRows ? `<div style="margin-top:14px"></div>${curRows}` : "") +
      (masteryRows ? `<div style="margin-top:14px"></div>${masteryRows}` : "") +
      `<div class="actions" style="margin-top:16px"><button class="btn" data-close>Close</button></div>`,
  );
}

export function offlineReport(seconds: number, loc: number, cash: number, kp: number, capped: boolean): void {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  openModal(
    `<h3>You were away</h3>` +
      `<p>The setup kept shipping for ${h > 0 ? `${h}h ` : ""}${m}m${capped ? ` (capped at ${D.offCap}h)` : ""}.</p>` +
      `<div class="kv"><span>Lines written</span><span>${fmt(loc)}</span></div>` +
      `<div class="kv"><span>Earned</span><span>${money(cash)}</span></div>` +
      `<div class="kv"><span>Knowledge</span><span>${fmt(kp)} KP</span></div>` +
      `<div class="actions" style="margin-top:16px"><button class="btn" data-close>Back to work</button></div>`,
  );
}
