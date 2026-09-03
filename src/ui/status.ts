import { D, S, mastery, rankName, track } from "../core/engine";
import { RANKS, PICK_RANK } from "../data/ranks";
import { GENERATORS } from "../data/generators";
import { SNIPPETS } from "../data/snippets";
import { clamp, fmt, money } from "../core/format";
import { $, el } from "./dom";

/* ---------------- status bar + rank strip + bug meter ---------------- */

let sigThrottle = 0;

export function paintStatus(): void {
  $("s-loc").textContent = fmt(S.loc);
  $("s-lps").innerHTML = `${fmt(D.lps)}<small>LOC/s</small>`;
  $("s-money").textContent = money(S.money);
  $("s-mps").innerHTML = `${money(D.mps)}<small>/s</small>`;
  $("s-kp").innerHTML = `${fmt(S.kp)}<small>KP</small>`;
  if (S.repLife > 0 || S.rep > 0) {
    $("s-repwrap").hidden = false;
    $("s-rep").innerHTML = `${fmt(S.rep)}<small>★</small>`;
  }
  $("click-per").textContent = `+${fmt(D.click)} LOC`;
  $("dock-per").textContent = `+${fmt(D.click)}`;

  const r = RANKS[S.rank];
  $("rank-idx").textContent = `Rank ${String(S.rank + 1).padStart(2, "0")} / ${RANKS.length}`;
  $("rank-title").textContent = rankName(S.rank);

  const t = track();
  const badge = t
    ? `${t.emoji} ${t.name}${mastery(t.id) ? ` · mastery ${mastery(t.id)}` : ""}`
    : S.rank >= PICK_RANK
      ? "◆ choose a specialisation"
      : "";
  const rt = $("rank-track");
  if (rt.dataset.v !== badge) {
    rt.dataset.v = badge;
    rt.innerHTML = badge ? `<span class="trackbadge">${badge}</span>` : "";
  }

  if (S.rank < RANKS.length - 1) {
    const next = RANKS[S.rank + 1];
    const p = clamp((S.runLoc - r.req) / (next.req - r.req), 0, 1);
    $("rank-bar").style.width = `${(p * 100).toFixed(1)}%`;
    $("rank-next").textContent = `Next: ${rankName(S.rank + 1)}`;
    $("rank-need").textContent = `${fmt(S.runLoc)} / ${fmt(next.req)}`;
  } else {
    $("rank-bar").style.width = "100%";
    $("rank-next").textContent = "Top of the ladder";
    $("rank-need").textContent = `${fmt(S.runLoc)} lines`;
  }

  paintBugs();

  let team = 0;
  for (const g of GENERATORS) team += S.gens[g.id] ?? 0;
  $("hands-pill").textContent = team === 0 ? "solo" : `${team} helpers`;

  if (++sigThrottle >= 3) {
    sigThrottle = 0;
    renderSignature();
  }
}

function paintBugs(): void {
  const bounty = track()?.sig === "bounty";
  const ratio = S.bugs / (S.bugs + D.bugTol);
  $("bug-count").textContent = fmt(S.bugs);
  $("bug-bar").style.width = `${(clamp(ratio, 0, 1) * 100).toFixed(1)}%`;

  const lost = (1 - D.penalty) * 100;
  const pill = $("bug-pill");
  pill.style.color = "";
  pill.style.background = "";
  if (bounty) {
    pill.textContent = "findings";
    pill.className = "pill acc";
  } else if (lost < 1) {
    pill.textContent = "clean";
    pill.className = "pill ok";
  } else if (lost < 12) {
    pill.textContent = "minor";
    pill.className = "pill";
  } else if (lost < 28) {
    pill.textContent = "degraded";
    pill.className = "pill acc";
  } else {
    pill.textContent = "on fire";
    pill.className = "pill";
    pill.style.color = "var(--fail)";
    pill.style.background = "var(--fail-wash)";
  }

  $("bug-note").textContent = bounty
    ? "Findings do not slow you down. They are inventory waiting to be sold."
    : lost < 1
      ? "Bugs pile up as you ship. They throttle your output."
      : `Bugs are costing you ${lost.toFixed(1)}% of your output right now.`;

  $("debug-note").textContent = bounty
    ? `Pays ${money(D.bountyValue)} per finding`
    : `Closes up to ${fmt(D.debug)} bugs`;
  for (const id of ["btn-debug", "dock-debug"]) {
    const b = $<HTMLButtonElement>(id);
    b.textContent = bounty ? "Submit" : "Squash";
    b.disabled = S.bugs < 1;
  }
}

/* ---------------- specialisation panel ---------------- */

function row(label: string, value: string, accent = false): string {
  return `<div class="sigrow"><span class="l">${label}</span><span class="r"${
    accent ? ' style="color:var(--accent)"' : ""
  }>${value}</span></div>`;
}

export function renderSignature(): void {
  const t = track();
  const panel = $("sigpanel");
  if (!t) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  $("sig-title").textContent = t.name;
  $("sig-pill").textContent = t.tag;

  let h = "";
  switch (t.sig) {
    case "hype": {
      const pctFull = clamp(S.hype / D.hypeCap, 0, 1);
      h =
        `<div><div class="meterlabel"><span>Hype</span><b class="num">${Math.floor(S.hype)} / ${Math.floor(D.hypeCap)}</b></div>` +
        `<div class="bar"><i class="hype" style="width:${(pctFull * 100).toFixed(1)}%"></i></div></div>` +
        row("Output multiplier from hype", `×${D.hypeMult.toFixed(2)}`, true) +
        row("Per click", `+${Math.floor(Math.max(2, D.hypeCap * 0.035))}`) +
        `<p class="hint" style="margin:0;font-size:11.5px">Keep writing to hold the multiplier. It drains when you stop.</p>`;
      break;
    }
    case "release": {
      const p = clamp(S.relT / 45, 0, 1);
      h =
        `<div><div class="meterlabel"><span>Next release</span><b class="num">${Math.ceil(45 - S.relT)}s</b></div>` +
        `<div class="bar"><i class="rel" style="width:${(p * 100).toFixed(1)}%"></i></div></div>` +
        row("Lines in this release", fmt(S.relLoc)) +
        `<div class="sigrow"><span class="l">Bonus it will pay</span><span class="r" style="color:var(--pass)">${money(D.relPay)}</span></div>`;
      break;
    }
    case "bounty":
      h =
        row("Open findings", fmt(S.bugs)) +
        row("Value per finding", money(D.bountyValue)) +
        `<div class="sigrow"><span class="l">If you submit now</span><span class="r" style="color:var(--pass)">${money(S.bugs * D.bountyValue)}</span></div>` +
        row("Paid out this run", money(S.bountyPaid)) +
        `<p class="hint" style="margin:0;font-size:11.5px">Let findings pile up, then cash them in below.</p>`;
      break;
    case "kernel":
      h =
        row("Machines produce", "×4") +
        row("Per-promotion scaling", "×1.32") +
        row("Current rank bonus", `×${fmt(1.32 ** S.rank)}`, true) +
        row("Offline", `${Math.round(D.offEff * 100)}% · ${D.offCap}h`);
      break;
    case "scaling":
      h =
        row("Knowledge banked", `${fmt(S.kp)} KP`) +
        row("Scaling exponent", D.kexp.toFixed(2)) +
        row("Output from knowledge", `×${D.kexpMult.toFixed(2)}`, true) +
        `<p class="hint" style="margin:0;font-size:11.5px">Spending KP on gateways lowers this. Hold some in reserve.</p>`;
      break;
    case "passes":
      h =
        row("Upgrades owned", String(Object.keys(S.upg).length)) +
        row("Worth per upgrade", `+${(D.passBonus * 100).toFixed(1)}%`) +
        row("Optimisation multiplier", `×${D.passMult.toFixed(2)}`, true) +
        `<p class="hint" style="margin:0;font-size:11.5px">Buy every upgrade you can. Each one lifts all the others.</p>`;
      break;
    case "budget":
      h =
        `<div class="sigrow"><span class="l">Tool cost</span><span class="r" style="color:var(--pass)">${Math.round(D.costMult * 100)}% of normal</span></div>` +
        row("Tools at 25 or more", `${D.at25} / ${GENERATORS.length}`) +
        row("Power-budget multiplier", `×${D.budgetMult.toFixed(2)}`, true);
      break;
  }
  $("sig-body").innerHTML = h;
}

/* ---------------- buffs ---------------- */

export function renderBuffs(): void {
  const host = $("buffs");
  host.innerHTML = "";
  $("buffpanel").hidden = S.buffs.length === 0;
  const now = Date.now();
  for (const b of S.buffs) {
    const secs = Math.max(0, Math.ceil((b.until - now) / 1000));
    host.appendChild(el("span", "buff", `${b.emoji} ${b.name} ×${b.mult} · ${secs}s`));
  }
}

/* ---------------- commit log ---------------- */

export function pushLog(text: string, cls: string): void {
  const host = $("log");
  const d = new Date();
  const stamp = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const line = el("div", "", `<span class="t">${stamp}</span><span class="${cls}">${text}</span>`);
  host.insertBefore(line, host.firstChild);
  while (host.children.length > 60) host.removeChild(host.lastChild!);
}

/* ---------------- fake editor ---------------- */

let gutter = 100;

export function pushLine(): void {
  const host = $("editor");
  const tier = clamp(Math.floor(S.rank / 3.2), 0, SNIPPETS.length - 1);
  const t = track();
  const pool = t && S.rank >= PICK_RANK ? [...t.snips, ...SNIPPETS[tier]] : SNIPPETS[tier];
  const txt = pool[Math.floor(Math.random() * pool.length)];
  gutter++;
  const line = el("div", "ln", `<span class="g">${gutter}</span><span>${txt}<span class="caret"></span></span>`);
  host.appendChild(line);
  let lines = host.querySelectorAll(".ln");
  while (lines.length > 9) {
    host.removeChild(lines[0]);
    lines = host.querySelectorAll(".ln");
  }
  const carets = host.querySelectorAll(".ln .caret");
  for (let i = 0; i < carets.length - 1; i++) carets[i].remove();
}

/* ---------------- floating +N ---------------- */

export function floatText(zone: HTMLElement, ev: MouseEvent | null, txt: string): void {
  const f = el("span", "float", txt);
  const r = zone.getBoundingClientRect();
  const x = ev?.clientX ? ev.clientX - r.left : r.width / 2;
  const y = ev?.clientY ? ev.clientY - r.top : r.height / 2;
  f.style.left = `${clamp(x - 18, 4, r.width - 60)}px`;
  f.style.top = `${clamp(y - 14, 0, r.height - 10)}px`;
  zone.appendChild(f);
  setTimeout(() => f.remove(), 900);
}
