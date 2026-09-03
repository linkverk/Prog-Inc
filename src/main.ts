import "./styles/base.css";
import "./styles/nav.css";
import "./styles/pages.css";
import "./styles/tree.css";

import { D, S, recompute, setState, tick, gainLoc, rankName } from "./core/engine";
import { PICK_RANK, RANKS } from "./data/ranks";
import { dueOpportunity, maybeIncident, scheduleOpportunity, takeOpportunity, type Opportunity } from "./core/events";
import { load, save } from "./core/save";
import { onLog } from "./core/bus";
import { fmt, money } from "./core/format";
import { pageUnlocked, unlockedPages, type PageId } from "./core/unlocks";
import { GENERATORS } from "./data/generators";

import { SHELL } from "./ui/shell";
import { $, el } from "./ui/dom";
import { closeModal, openModal } from "./ui/modal";
import { paintStatus, pushLine, pushLog, renderBuffs, renderSignature } from "./ui/status";
import { toast } from "./ui/toast";
import { current, go, mountPages, renderActive } from "./ui/router";
import { buildNav, paintNav, setBadge } from "./ui/nav";
import { anyAffordable } from "./ui/treetab";

import { page as desk, pressDebug, pressWrite } from "./ui/pages/desk";
import { page as tools } from "./ui/pages/tools";
import { page as skills } from "./ui/pages/skills";
import { page as career, offerTrack } from "./ui/pages/career";
import { page as awards } from "./ui/pages/awards";
import { page as hop } from "./ui/pages/hop";
import { page as stats } from "./ui/pages/stats";
import { page as settings, applyTheme, onStateReload, toggleTheme } from "./ui/pages/settings";

/* ------------------------------------------------------------------ *
 *  boot
 * ------------------------------------------------------------------ */

$("app").innerHTML = SHELL;

const { state, existed } = load();
setState(state);
applyTheme();
onLog(pushLog);

function renderAll(): void {
  recompute();
  renderActive();
  renderBuffs();
  renderSignature();
  paintStatus();
  refreshBadges();
}

/** Click-driven gains still need rank and award checks; tick(0) does exactly that. */
function handleProgress(): void {
  const res = tick(0);
  announce(res.promotions, res.awards, 0);
  paintStatus();
}

function afterChange(): void {
  recompute();
  paintStatus();
  refreshBadges();
}

mountPages([desk, tools, skills, career, awards, hop, stats, settings], {
  changed: afterChange,
  progress: handleProgress,
});
buildNav();
onStateReload(renderAll);

/* ------------------------------------------------------------------ *
 *  HUD, dock, keys
 * ------------------------------------------------------------------ */

$("btn-theme").addEventListener("click", toggleTheme);
$("btn-settings").addEventListener("click", () => go("settings"));
$("dock-code").addEventListener("click", (ev) => pressWrite($("dock"), ev));
$("dock-debug").addEventListener("click", pressDebug);

document.addEventListener("keydown", (e) => {
  if (e.key === " " && e.target === document.body) {
    e.preventDefault();
    pressWrite(current() === "desk" ? $("clickzone") : $("dock"), null);
  }
  if (e.key === "Escape") closeModal();
});

/* ------------------------------------------------------------------ *
 *  badges and page reveals
 * ------------------------------------------------------------------ */

function refreshBadges(): void {
  const gen = GENERATORS.some((g) => S.money >= (D.genCost[g.id] ?? g.cost));
  setBadge("tools", gen ? "dot" : null);
  setBadge("skills", anyAffordable() ? "dot" : null);
  setBadge("career", !S.track && S.rank >= PICK_RANK ? "dot" : null);
  setBadge("hop", S.runLoc >= 2e7 ? "dot" : null);
  paintNav();
}

const REVEAL: Record<PageId, string> = {
  desk: "",
  tools: "Tools unlocked. Your first purchase is waiting.",
  skills: "Skills unlocked. Knowledge opens the first gateway.",
  career: "Career unlocked. The ladder is now visible.",
  awards: "Awards unlocked.",
  hop: "Job Hop unlocked. Twenty million lines this run makes it worth it.",
  stats: "Stats unlocked.",
  settings: "",
};

let known = new Set<PageId>(unlockedPages());

/** Whatever an old save has already earned opens silently; only new reveals are announced. */
function watchUnlocks(): void {
  const now = unlockedPages();
  let changed = false;
  for (const id of now) {
    if (known.has(id)) continue;
    changed = true;
    if (REVEAL[id]) {
      pushLog(REVEAL[id], "hi");
      toast(REVEAL[id], "hi");
    }
  }
  if (changed) {
    known = new Set(now);
    paintNav();
  }
}

/* ------------------------------------------------------------------ *
 *  opportunities
 * ------------------------------------------------------------------ */

let chip: HTMLElement | null = null;

function showChip(o: Opportunity): void {
  chip = el(
    "button",
    "chip",
    `<span class="em">${o.emoji}</span><span>${o.name}<div class="sub">${o.sub}</div></span>`,
  );
  const mine = chip;
  chip.addEventListener("click", () => {
    takeOpportunity(o);
    removeChip();
    renderAll();
  });
  $("eventzone").appendChild(chip);
  setTimeout(() => {
    if (chip === mine) removeChip();
  }, 14_000);
}

function removeChip(): void {
  chip?.remove();
  chip = null;
}

/* ------------------------------------------------------------------ *
 *  loop
 * ------------------------------------------------------------------ */

function announce(promotions: number[], awards: string[], released: number): void {
  for (const r of promotions) {
    pushLog(`Promoted to ${rankName(r)}. ${RANKS[r].note}`, "hi");
    toast(`Promoted to ${rankName(r)}.`, "hi");
  }
  for (const a of awards) {
    pushLog(`Award unlocked: ${a}.`, "hi");
    toast(`Award: ${a}`, "good");
  }
  if (released > 0) pushLog(`Shipped a release. Bonus: $${fmt(released)}.`, "good");
  if (promotions.length) {
    if (current() === "career") renderActive();
    if (S.rank >= PICK_RANK && !S.track && !S.trackDeferred) setTimeout(offerTrack, 260);
  }
  if (awards.length && current() === "awards") renderActive();
}

let last = Date.now();

function loop(): void {
  const now = Date.now();
  const dt = Math.min(1, (now - last) / 1000);
  last = now;

  const res = tick(dt);
  announce(res.promotions, res.awards, res.released);

  if (!chip) {
    const o = dueOpportunity();
    if (o) showChip(o);
  }
  maybeIncident();

  paintStatus();
}

/* offline catch-up */
function offlineCatchUp(): void {
  const away = (Date.now() - (S.lastSave || Date.now())) / 1000;
  if (away < 60) return;
  recompute();
  const capped = Math.min(away, D.offCap * 3600);
  const loc = D.lps * capped * D.offEff;
  if (loc < 1) return;
  const cash = loc * D.locValue;
  const kp = loc * D.kpRate;
  gainLoc(loc);
  S.bugs += D.rawLps * Math.max(0, D.bugRate - D.clean) * capped * 0.3;
  tick(0);
  setTimeout(() => offlineReport(capped, loc, cash, kp, away > D.offCap * 3600), 260);
}

function offlineReport(seconds: number, loc: number, cash: number, kp: number, capped: boolean): void {
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

renderAll();
for (let i = 0; i < 4; i++) pushLine();
scheduleOpportunity();

if (existed) {
  pushLog("Welcome back.", "");
  offlineCatchUp();
} else {
  pushLog("New machine, empty folder, blinking cursor.", "");
  pushLog("Press Write code. That is how everyone starts.", "hi");
}
if (!S.track && !S.trackDeferred && S.rank >= PICK_RANK) setTimeout(offerTrack, 900);
if (!pageUnlocked(current())) go("desk");

setInterval(loop, 100);
setInterval(() => {
  if (D.lps > 0) pushLine();
}, 1400);
setInterval(() => {
  renderBuffs();
  refreshBadges();
  watchUnlocks();
}, 1000);
setInterval(renderActive, 2500);
setInterval(() => save(S), 10_000);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) save(S);
});
window.addEventListener("beforeunload", () => save(S));
