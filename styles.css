import type { BranchId, Skill } from "../core/types";
import { D, S, SKILL_BY_ID, branchOpen, skillUnlocked } from "../core/engine";
import { SKILLS } from "../data/skills.generated";
import { BRANCHES, BRANCH_BY_ID } from "../data/branches";
import { skillCost } from "../core/effects";
import { buySkill, buySkillBulk } from "../core/actions";
import { fmt } from "../core/format";
import { $, delegate, esc } from "./dom";

type Selection = BranchId | "global";

let selected: Selection = "global";
let onChange: () => void = () => {};

const byBranch = new Map<Selection, Skill[]>();
for (const s of SKILLS) {
  const key = s.branch as Selection;
  if (!byBranch.has(key)) byBranch.set(key, []);
  byBranch.get(key)!.push(s);
}

const TIER_TITLES = ["Gateways", "Fundamentals", "Working Knowledge", "Depth", "Mastery", "Capstone"];

export function initBranches(changed: () => void): void {
  onChange = changed;

  delegate($("branchlist"), "[data-branch]", (t) => {
    selected = t.dataset.branch as Selection;
    renderBranches();
  });

  delegate($("branchbody"), "[data-buy]", (t) => {
    const sk = SKILL_BY_ID[t.dataset.buy!];
    if (!sk) return;
    const n = Number(t.dataset.n ?? "1");
    const bought = n === 1 ? (buySkill(sk) === "ok" ? 1 : 0) : buySkillBulk(sk, n);
    if (bought > 0) {
      renderBranches();
      onChange();
    }
  });

  $("branch-hint").innerHTML =
    "Eight branches, eight currencies, eight different ways to earn them. " +
    "<b>Gateways open a path and are bought once — they can never be upgraded.</b> " +
    "Everything else levels up.";
}

/** How many more levels the current balance can pay for. */
function affordableLevels(sk: Skill, owned: number, cap: number): number {
  const balance = sk.currency === "kp" ? S.kp : S.cur[sk.currency];
  let spend = 0;
  let n = 0;
  while (n < cap && owned + n < sk.maxLevel) {
    const next = skillCost(sk, owned + n);
    if (spend + next > balance) break;
    spend += next;
    n++;
  }
  return n;
}

export function renderBranches(): void {
  renderBranchList();
  renderBranchBody();
}

function renderBranchList(): void {
  const host = $("branchlist");
  const rows: string[] = [];

  const globalOwned = (byBranch.get("global") ?? []).filter((s) => S.skills[s.id]).length;
  rows.push(
    `<button class="bchip" data-branch="global" aria-pressed="${selected === "global"}">` +
      `<span class="bn">Foundation <span class="bsym">KP</span></span>` +
      `<span class="bbal">${fmt(S.kp)} knowledge</span>` +
      `<span class="brate">${globalOwned}/4 gateways · +${fmt(D.kps)}/s</span>` +
      `</button>`,
  );

  for (const b of BRANCHES) {
    const open = branchOpen(b.id);
    const owned = (byBranch.get(b.id) ?? []).filter((s) => S.skills[s.id]).length;
    const total = (byBranch.get(b.id) ?? []).length;
    rows.push(
      `<button class="bchip${open ? "" : " shut"}" data-branch="${b.id}" aria-pressed="${selected === b.id}">` +
        `<span class="bn">${b.name} <span class="bsym">${b.sym}</span></span>` +
        (open
          ? `<span class="bbal">${fmt(S.cur[b.id])} ${b.curName}</span>` +
            `<span class="brate">+${fmt(D.curRate[b.id])}/s · ${owned}/${total} skills</span>`
          : `<span class="blocked">locked · ${fmt(b.gateCost)} KP</span>`) +
        `</button>`,
    );
  }
  host.innerHTML = rows.join("");
}

function skillCard(sk: Skill): string {
  const owned = S.skills[sk.id] ?? 0;
  const unlocked = skillUnlocked(sk);
  const maxed = owned >= sk.maxLevel;
  const cost = skillCost(sk, owned);
  const balance = sk.currency === "kp" ? S.kp : S.cur[sk.currency as BranchId];
  const sym = sk.currency === "kp" ? "KP" : BRANCH_BY_ID[sk.currency as BranchId].sym;
  const can = unlocked && !maxed && balance >= cost;

  const cls =
    "sk" +
    (sk.gateway ? " gate" : "") +
    (sk.gateway && owned ? " owned" : "") +
    (maxed ? " max" : "") +
    (!unlocked ? " locked" : can ? " ready" : "");

  const levelLabel = sk.gateway
    ? owned
      ? "opened"
      : "one-time"
    : `${owned} / ${sk.maxLevel}`;

  const missing = sk.req
    .filter((r) => !(S.skills[r] ?? 0))
    .map((r) => SKILL_BY_ID[r]?.name ?? r);

  const bar = sk.gateway
    ? ""
    : `<div class="skbar"><i style="width:${((owned / sk.maxLevel) * 100).toFixed(0)}%"></i></div>`;

  let footer: string;
  if (maxed) {
    footer = `<div class="skf"><span class="skc ok">${sk.gateway ? "open" : "maxed"}</span></div>`;
  } else if (!unlocked) {
    footer = `<div class="skf"><span class="skc no">${fmt(cost)} ${sym}</span></div>`;
  } else {
    const ten = affordableLevels(sk, owned, 10);
    const all = affordableLevels(sk, owned, sk.maxLevel - owned);
    footer =
      `<div class="skf"><span class="skc ${can ? "ok" : "no"}">${fmt(cost)} ${sym}</span>` +
      `<span class="buyrow">` +
      `<button data-buy="${sk.id}" data-n="1"${can ? "" : " disabled"}>${sk.gateway ? "Open" : "+1"}</button>` +
      (sk.gateway
        ? ""
        : `<button data-buy="${sk.id}" data-n="10"${ten > 1 ? "" : " disabled"}>+${Math.max(ten, 10)}</button>` +
          `<button data-buy="${sk.id}" data-n="${sk.maxLevel}"${all > 1 ? "" : " disabled"}>Max</button>`) +
      `</span></div>`;
  }

  return (
    `<div class="${cls}">` +
    `<div class="skh"><span class="skn">${esc(sk.name)}</span><span class="skl">${levelLabel}</span></div>` +
    `<div class="skd">${esc(sk.desc)}</div>` +
    (missing.length ? `<div class="skreq">Needs: ${missing.map(esc).join(" + ")}</div>` : "") +
    bar +
    footer +
    `</div>`
  );
}

function renderBranchBody(): void {
  const host = $("branchbody");
  const skills = byBranch.get(selected) ?? [];

  let head: string;
  if (selected === "global") {
    head =
      `<div class="branchhead"><div><h3>Foundation</h3>` +
      `<div class="faucet">Bought with knowledge points, which every line of code produces. ` +
      `These four are one-time purchases that open the rest of the tree.</div></div>` +
      `<div class="bal"><b>${fmt(S.kp)}</b><span>KP · +${fmt(D.kps)}/s</span></div></div>`;
  } else {
    const b = BRANCH_BY_ID[selected];
    const open = branchOpen(b.id);
    head =
      `<div class="branchhead"><div><h3>${b.name} <span style="color:var(--accent)">${b.sym}</span></h3>` +
      `<div class="faucet">${b.blurb}<br><b>${b.curName}:</b> ${b.faucet}</div></div>` +
      `<div class="bal"><b>${open ? fmt(S.cur[b.id]) : "—"}</b>` +
      `<span>${b.curName}${open ? ` · +${fmt(D.curRate[b.id])}/s` : " · locked"}</span></div></div>`;
  }

  const sections: string[] = [];
  for (let tier = 0; tier <= 5; tier++) {
    const group = skills.filter((s) => s.tier === tier);
    if (!group.length) continue;
    const label = tier === 0 ? TIER_TITLES[0] : `Tier ${tier} · ${TIER_TITLES[tier]}`;
    sections.push(`<div class="tierhead">${label}</div>`);
    sections.push(`<div class="skillgrid">${group.map(skillCard).join("")}</div>`);
  }

  host.innerHTML = head + sections.join("");
}

/** Is anything buyable right now? Drives the tab dot. */
export function anySkillAffordable(): boolean {
  for (const sk of SKILLS) {
    const owned = S.skills[sk.id] ?? 0;
    if (owned >= sk.maxLevel) continue;
    if (!skillUnlocked(sk)) continue;
    const balance = sk.currency === "kp" ? S.kp : S.cur[sk.currency as BranchId];
    if (balance >= skillCost(sk, owned)) return true;
  }
  return false;
}
