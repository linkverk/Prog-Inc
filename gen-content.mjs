import "./styles.css";

import { D, S, recompute, setState, tick, upgradeUnlocked, gainLoc, rankName } from "./core/engine";
import { UPGRADES } from "./data/upgrades.generated";
import { PICK_RANK, RANKS } from "./data/ranks";
import { debugSession, writeCode } from "./core/actions";
import { dueOpportunity, maybeIncident, scheduleOpportunity, takeOpportunity, type Opportunity } from "./core/events";
import { exportSave, importSave, load, save, wipe } from "./core/save";
import { newGame } from "./core/state";
import { onLog } from "./core/bus";
import { fmt } from "./core/format";

import { SHELL } from "./ui/shell";
import { $, el } from "./ui/dom";
import { closeModal, openModal } from "./ui/modal";
import { floatText, paintStatus, pushLine, pushLog, renderBuffs, renderSignature } from "./ui/status";
import { initSetup, refreshSetup } from "./ui/setup";
import { initShop, renderShop } from "./ui/shop";
import { anySkillAffordable, initBranches, renderBranches } from "./ui/branches";
import {
  initPanels, offerTrack, offlineReport, openStats,
  renderAwards, renderCareer, renderPrestige, renderTrack,
} from "./ui/panels";

/* ------------------------------------------------------------------ *
 *  boot
 * ------------------------------------------------------------------ */

$("app").innerHTML = SHELL;

const { state, existed } = load();
setState(state);
applyTheme();
onLog(pushLog);

type TabName = "setup" | "shop" | "branches" | "track" | "career" | "awards" | "reset";
const TABS: TabName[] = ["setup", "shop", "branches", "track", "career", "awards", "reset"];
let activeTab: TabName = "setup";

function renderAll(): void {
  recompute();
  refreshSetup();
  renderShop();
  renderBranches();
  renderTrack();
  renderCareer();
  renderAwards();
  renderPrestige();
  renderBuffs();
  renderSignature();
  paintStatus();
}

function setTab(name: TabName): void {
  activeTab = name;
  document.querySelectorAll<HTMLElement>("#tabs .tab").forEach((t) => {
    t.setAttribute("aria-selected", String(t.dataset.tab === name));
  });
  for (const p of TABS) $(`pane-${p}`).hidden = p !== name;
  if (name === "shop") renderShop();
  if (name === "branches") renderBranches();
  if (name === "track") renderTrack();
  if (name === "career") renderCareer();
  if (name === "awards") renderAwards();
  if (name === "reset") renderPrestige();
  refreshDots();
}

function refreshDots(): void {
  const shopReady = UPGRADES.some((u) => !S.upg[u.id] && upgradeUnlocked(u) && S.money >= u.cost);
  $("dot-shop").hidden = !shopReady || activeTab === "shop";
  $("dot-br").hidden = !anySkillAffordable() || activeTab === "branches";
  $("dot-trk").hidden = !(!S.track && S.rank >= PICK_RANK) || activeTab === "track";
  $("dot-rst").hidden = S.runLoc < 2e7 || activeTab === "reset";
}

initSetup(afterPurchase);
initShop(afterPurchase);
initBranches(afterPurchase);
initPanels(renderAll);

function afterPurchase(): void {
  refreshSetup();
  paintStatus();
  refreshDots();
}

/* ------------------------------------------------------------------ *
 *  controls
 * ------------------------------------------------------------------ */

$("tabs").addEventListener("click", (e) => {
  const t = (e.target as HTMLElement | null)?.closest(".tab") as HTMLElement | null;
  if (t?.dataset.tab) setTab(t.dataset.tab as TabName);
});

$("btn-code").addEventListener("click", (ev) => {
  const gained = writeCode();
  pushLine();
  floatText(ev, `+${fmt(gained)}`);
  handleProgress();
  paintStatus();
});

$("btn-debug").addEventListener("click", () => {
  debugSession();
  paintStatus();
  if (activeTab === "branches") renderBranches();
});

$("btn-stats").addEventListener("click", (e) => {
  e.stopPropagation();
  openStats();
});

$("btn-theme").addEventListener("click", () => {
  const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  S.theme = !S.theme ? (systemDark ? "light" : "dark") : S.theme === "dark" ? "light" : "dark";
  applyTheme();
  save(S);
});

$("btn-settings").addEventListener("click", openSettings);

document.addEventListener("keydown", (e) => {
  if (e.key === " " && e.target === document.body) {
    e.preventDefault();
    writeCode();
    pushLine();
    handleProgress();
    paintStatus();
  }
  if (e.key === "Escape") closeModal();
});

function applyTheme(): void {
  if (S.theme) document.documentElement.setAttribute("data-theme", S.theme);
  else document.documentElement.removeAttribute("data-theme");
}

function openSettings(): void {
  openModal(
    `<h3>Settings</h3><p>Your run lives in this browser only.</p>` +
      `<div class="actions" style="justify-content:flex-start;margin-bottom:14px">` +
      `<button class="btn ghost" id="m-export">Copy save</button>` +
      `<button class="btn ghost" id="m-import">Load save</button>` +
      `<button class="btn ghost" id="m-wipe" style="color:var(--fail)">Erase everything</button></div>` +
      `<textarea id="m-box" spellcheck="false" placeholder="Paste a save here, then press Load save"></textarea>` +
      `<div class="actions" style="margin-top:14px"><button class="btn" data-close>Done</button></div>`,
  );
  $("m-export").addEventListener("click", () => {
    const box = $<HTMLTextAreaElement>("m-box");
    box.value = exportSave(S);
    box.select();
  });
  $("m-import").addEventListener("click", () => {
    const parsed = importSave($<HTMLTextAreaElement>("m-box").value);
    if (!parsed) {
      window.alert("That does not look like a save from this game.");
      return;
    }
    setState(parsed);
    closeModal();
    renderAll();
    pushLog("Save loaded.", "hi");
  });
  $("m-wipe").addEventListener("click", () => {
    openModal(
      `<h3>Erase everything?</h3><p>Every run, star, perk, mastery and award is deleted. There is no undo.</p>` +
        `<div class="actions"><button class="btn ghost" data-close>Keep it</button>` +
        `<button class="btn" id="m-yes" style="background:var(--fail);color:#fff">Erase</button></div>`,
    );
    $("m-yes").addEventListener("click", () => {
      wipe();
      setState(newGame());
      closeModal();
      renderAll();
      pushLog("Fresh start. Line one.", "");
    });
  });
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

/** Click-driven gains still need rank and award checks; tick(0) does exactly that. */
function handleProgress(): void {
  const res = tick(0);
  announce(res.promotions, res.awards, 0);
}

function announce(promotions: number[], awards: string[], released: number): void {
  for (const r of promotions) pushLog(`Promoted to ${rankName(r)}. ${RANKS[r].note}`, "hi");
  for (const a of awards) pushLog(`Award unlocked: ${a}.`, "hi");
  if (released > 0) pushLog(`Shipped a release. Bonus: $${fmt(released)}.`, "good");
  if (promotions.length) {
    renderCareer();
    if (S.rank >= PICK_RANK && !S.track && !S.trackDeferred) setTimeout(offerTrack, 260);
  }
  if (awards.length) renderAwards();
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
  refreshSetup();
  refreshDots();
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

setInterval(loop, 100);
setInterval(() => {
  if (D.lps > 0) pushLine();
}, 1400);
setInterval(renderBuffs, 1000);
setInterval(() => {
  if (activeTab === "shop") renderShop();
  if (activeTab === "branches") renderBranches();
}, 2500);
setInterval(() => save(S), 10_000);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) save(S);
});
window.addEventListener("beforeunload", () => save(S));
