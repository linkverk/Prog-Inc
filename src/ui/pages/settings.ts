/** Saves, theme, and the keys. Reached from the HUD gear rather than the sidebar. */

import type { Page, PageCtx } from "../router";
import { S, setState } from "../../core/engine";
import { exportSave, importSave, save, wipe } from "../../core/save";
import { newGame } from "../../core/state";
import { $ } from "../dom";
import { closeModal, openModal } from "../modal";
import { pushLog } from "../status";
import { toast } from "../toast";

let ctx: PageCtx = { changed: () => {}, progress: () => {} };
let onReload: () => void = () => {};

const HTML = `
<div class="statgrid">
  <div class="panel">
    <div class="panel-h"><h2>Save</h2></div>
    <div class="panel-b">
      <p class="hint">Your run lives in this browser only, saved every ten seconds. Copy it to move it elsewhere.</p>
      <div class="actions" style="justify-content:flex-start;margin-bottom:10px">
        <button class="btn ghost" id="set-export">Copy save</button>
        <button class="btn ghost" id="set-import">Load save</button>
      </div>
      <textarea id="set-box" spellcheck="false" placeholder="Paste a save here, then press Load save"></textarea>
    </div>
  </div>
  <div class="panel">
    <div class="panel-h"><h2>Appearance</h2></div>
    <div class="panel-b">
      <div class="kv"><span>Theme</span><span><button class="minibtn" id="set-theme">Toggle</button></span></div>
    </div>
  </div>
  <div class="panel">
    <div class="panel-h"><h2>Keys</h2></div>
    <div class="panel-b">
      <div class="kv"><span>Write a line</span><span>Space</span></div>
      <div class="kv"><span>Switch page</span><span>1 &ndash; 9</span></div>
      <div class="kv"><span>Close a dialog</span><span>Esc</span></div>
    </div>
  </div>
  <div class="panel">
    <div class="panel-h"><h2>Danger</h2></div>
    <div class="panel-b">
      <p class="hint">Erasing deletes every run, star, perk, mastery and award. There is no undo.</p>
      <button class="btn ghost" id="set-wipe" style="color:var(--fail)">Erase everything</button>
    </div>
  </div>
</div>
`;

/** The theme toggle lives in two places; both call this. */
export function toggleTheme(): void {
  const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  S.theme = !S.theme ? (systemDark ? "light" : "dark") : S.theme === "dark" ? "light" : "dark";
  applyTheme();
  save(S);
}

export function applyTheme(): void {
  if (S.theme) document.documentElement.setAttribute("data-theme", S.theme);
  else document.documentElement.removeAttribute("data-theme");
}

/** Called after a whole-state swap so every page repaints. */
export function onStateReload(fn: () => void): void {
  onReload = fn;
}

export const page: Page = {
  id: "settings",
  label: "Settings",
  glyph: "⚙",
  html: HTML,
  hud: true,
  init(c) {
    ctx = c;
    $("set-theme").addEventListener("click", toggleTheme);
    $("set-export").addEventListener("click", () => {
      const box = $<HTMLTextAreaElement>("set-box");
      box.value = exportSave(S);
      box.select();
      toast("Save copied to the box. Select all and copy.");
    });
    $("set-import").addEventListener("click", () => {
      const parsed = importSave($<HTMLTextAreaElement>("set-box").value);
      if (!parsed) {
        toast("That does not look like a save from this game.", "bad");
        return;
      }
      setState(parsed);
      applyTheme();
      onReload();
      pushLog("Save loaded.", "hi");
      toast("Save loaded.", "hi");
      ctx.changed();
    });
    $("set-wipe").addEventListener("click", () => {
      openModal(
        `<h3>Erase everything?</h3><p>Every run, star, perk, mastery and award is deleted. There is no undo.</p>` +
          `<div class="actions"><button class="btn ghost" data-close>Keep it</button>` +
          `<button class="btn" id="m-yes" style="background:var(--fail);color:#fff">Erase</button></div>`,
      );
      $("m-yes").addEventListener("click", () => {
        wipe();
        setState(newGame());
        applyTheme();
        closeModal();
        onReload();
        pushLog("Fresh start. Line one.", "");
        ctx.changed();
      });
    });
  },
  render() {},
};
