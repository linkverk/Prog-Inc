/** The workbench: where lines get written, bugs get squashed, and the log scrolls. */

import type { Page, PageCtx } from "../router";
import { debugSession, writeCode } from "../../core/actions";
import { fmt } from "../../core/format";
import { $ } from "../dom";
import { floatText, paintStatus, pushLine } from "../status";
import { go } from "../router";

let ctx: PageCtx = { changed: () => {}, progress: () => {} };

const HTML = `
<div class="deskgrid">
  <div class="deskcol">
    <div class="panel">
      <div class="panel-h"><h2>main.py &mdash; you</h2><span class="pill" id="hands-pill">solo</span></div>
      <div class="editor" id="editor"><div class="fade"></div></div>
      <div class="clickzone" id="clickzone">
        <button class="bigbtn" id="btn-code">Write code <span class="per" id="click-per">+1 LOC</span></button>
      </div>
    </div>

    <div class="panel" id="sigpanel" hidden>
      <div class="panel-h"><h2 id="sig-title">Specialisation</h2><span class="pill acc" id="sig-pill"></span></div>
      <div class="panel-b sig" id="sig-body"></div>
    </div>

    <div class="panel" id="buffpanel" hidden>
      <div class="panel-h"><h2>Active effects</h2></div>
      <div class="panel-b" style="padding-top:10px"><div class="buffs" id="buffs"></div></div>
    </div>
  </div>

  <div class="deskcol">
    <div class="panel">
      <div class="panel-h"><h2>Codebase health</h2><span class="pill" id="bug-pill">clean</span></div>
      <div class="panel-b">
        <div class="meterlabel"><span>Open bugs</span><b class="num" id="bug-count">0</b></div>
        <div class="bar"><i class="bug" id="bug-bar" style="width:0%"></i></div>
        <p class="hint" style="margin:9px 0 0;font-size:11.5px" id="bug-note">Bugs pile up as you ship. They throttle your output.</p>
      </div>
      <div class="subrow">
        <div>
          <div style="font-weight:600;font-size:13px">Debug session</div>
          <div style="font-size:11.5px;color:var(--ink3)" id="debug-note">Closes bugs by hand</div>
        </div>
        <button class="minibtn" id="btn-debug">Squash</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-h"><h2>Commit log</h2><button class="iconbtn" id="btn-stats" style="width:26px;height:24px;font-size:11px" title="Career stats">&#8942;</button></div>
      <div class="log" id="log"></div>
    </div>
  </div>
</div>
`;

/** One manual line, from the desk button, the dock, or the space bar. */
export function pressWrite(zone: HTMLElement | null, ev: MouseEvent | null): void {
  const gained = writeCode();
  pushLine();
  if (zone) floatText(zone, ev, `+${fmt(gained)}`);
  ctx.progress();
}

export function pressDebug(): void {
  debugSession();
  ctx.changed();
}

export const page: Page = {
  id: "desk",
  label: "Desk",
  glyph: ">_",
  html: HTML,
  init(c) {
    ctx = c;
    $("btn-code").addEventListener("click", (ev) => pressWrite($("clickzone"), ev));
    $("btn-debug").addEventListener("click", pressDebug);
    $("btn-stats").addEventListener("click", () => go("stats"));
  },
  render: paintStatus,
};
