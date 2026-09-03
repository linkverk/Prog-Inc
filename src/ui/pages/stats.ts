/** Career stats: the numbers behind the run, and the branch currencies you have touched. */

import type { Page } from "../router";
import { D, S, mastery, track } from "../../core/engine";
import { TRACKS } from "../../data/tracks";
import { BRANCHES } from "../../data/branches";
import { fmt } from "../../core/format";
import { $ } from "../dom";

const HTML = `
<div class="statgrid">
  <div class="panel"><div class="panel-h"><h2>This career</h2></div><div class="panel-b" id="stats-main"></div></div>
  <div class="panel"><div class="panel-h"><h2>Branch currencies</h2></div><div class="panel-b" id="stats-cur"></div></div>
  <div class="panel"><div class="panel-h"><h2>Mastery</h2></div><div class="panel-b" id="stats-mastery"></div></div>
</div>
`;

const kv = (k: string, v: string) => `<div class="kv"><span>${k}</span><span>${v}</span></div>`;

function render(): void {
  const mins = Math.floor((Date.now() - S.started) / 60000);
  const t = track();
  $("stats-main").innerHTML =
    kv("Specialisation", t ? t.name : "none yet") +
    kv("Lines this run", fmt(S.runLoc)) +
    kv("Lines all time", fmt(S.totalLoc)) +
    kv("Lines typed by hand", fmt(S.clicks)) +
    kv("Bugs squashed", fmt(S.bugsKilled)) +
    kv("Opportunities caught", fmt(S.events)) +
    kv("Job hops", fmt(S.hops)) +
    kv("Skill levels owned", fmt(Object.values(S.skills).reduce((a, b) => a + b, 0))) +
    kv("Upgrades owned", String(Object.keys(S.upg).length)) +
    kv("Global output multiplier", `×${fmt(D.all)}`) +
    kv("Income multiplier", `×${fmt(D.moneyM)}`) +
    kv("Time in career", mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`);

  const curRows = BRANCHES.filter((b) => S.curLife[b.id] > 0)
    .map((b) => kv(`${b.sym} ${b.curName}`, `${fmt(S.cur[b.id])} held · ${fmt(S.curLife[b.id])} earned`))
    .join("");
  $("stats-cur").innerHTML = curRows || `<p class="hint" style="margin:0">No branch opened yet. Gateways on the Skills page start a currency flowing.</p>`;

  const masteryRows = TRACKS.filter((k) => mastery(k.id) > 0)
    .map((k) => kv(`${k.emoji} ${k.name}`, `mastery ${mastery(k.id)}`))
    .join("");
  $("stats-mastery").innerHTML = masteryRows || `<p class="hint" style="margin:0">Mastery is banked when you hop jobs while specialised.</p>`;
}

export const page: Page = {
  id: "stats",
  label: "Stats",
  glyph: "Σ",
  html: HTML,
  init() {},
  render,
};
