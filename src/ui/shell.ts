/** The static markup skeleton. Everything dynamic is filled in by the render modules. */
export const SHELL = `
<div class="statusbar">
  <div class="statusbar-in">
    <div class="wordmark">zero<i>&rarr;</i>10x</div>
    <div class="stats">
      <div class="stat"><div class="k">Lines of code</div><div class="v loc num" id="s-loc">0</div></div>
      <div class="stat"><div class="k">Output</div><div class="v loc num" id="s-lps">0</div></div>
      <div class="stat"><div class="k">Bank</div><div class="v money num" id="s-money">$0</div></div>
      <div class="stat"><div class="k">Income</div><div class="v money num" id="s-mps">$0</div></div>
      <div class="stat"><div class="k">Knowledge</div><div class="v kp num" id="s-kp">0</div></div>
      <div class="stat" id="s-repwrap" hidden><div class="k">Reputation</div><div class="v rep num" id="s-rep">0</div></div>
    </div>
    <button class="iconbtn" id="btn-theme" title="Toggle theme" aria-label="Toggle theme">&#9681;</button>
    <button class="iconbtn" id="btn-settings" title="Settings" aria-label="Settings">&#9881;</button>
  </div>
</div>

<div class="wrap">
  <div class="rankstrip">
    <div>
      <div class="rank-idx" id="rank-idx">Rank 01 / 16</div>
      <div class="rank-title" id="rank-title">Curious Beginner</div>
      <div style="margin-top:5px" id="rank-track"></div>
    </div>
    <div class="rank-prog">
      <div class="bar"><i id="rank-bar" style="width:0%"></i></div>
      <div class="rank-next"><span id="rank-next">Next: Hobbyist</span><span id="rank-need" class="num">0 / 400</span></div>
    </div>
  </div>

  <div class="cols">
    <div style="display:flex;flex-direction:column;gap:14px">
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

      <div class="panel" id="buffpanel" hidden>
        <div class="panel-h"><h2>Active effects</h2></div>
        <div class="panel-b" style="padding-top:10px"><div class="buffs" id="buffs"></div></div>
      </div>

      <div class="panel">
        <div class="panel-h"><h2>Commit log</h2><button class="iconbtn" id="btn-stats" style="width:26px;height:24px;font-size:11px" title="Career stats">&#8942;</button></div>
        <div class="log" id="log"></div>
      </div>
    </div>

    <div class="panel">
      <div class="tabstrip">
        <div class="tabs" role="tablist" id="tabs">
          <button class="tab" role="tab" data-tab="setup" aria-selected="true">Setup</button>
          <button class="tab" role="tab" data-tab="shop" aria-selected="false">Upgrades<span class="dot" id="dot-shop" hidden></span></button>
          <button class="tab" role="tab" data-tab="branches" aria-selected="false">Branches<span class="dot" id="dot-br" hidden></span></button>
          <button class="tab" role="tab" data-tab="track" aria-selected="false">Track<span class="dot" id="dot-trk" hidden></span></button>
          <button class="tab" role="tab" data-tab="career" aria-selected="false">Career</button>
          <button class="tab" role="tab" data-tab="awards" aria-selected="false">Awards</button>
          <button class="tab" role="tab" data-tab="reset" aria-selected="false">Job Hop<span class="dot" id="dot-rst" hidden></span></button>
        </div>
      </div>

      <div class="tabpane" id="pane-setup">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:11px">
          <p class="hint" style="margin:0">Everything that writes code while you don't. Each purchase costs more than the last.</p>
          <div class="buybar">
            <button class="minibtn" data-bulk="1" aria-pressed="true">&times;1</button>
            <button class="minibtn" data-bulk="10" aria-pressed="false">&times;10</button>
            <button class="minibtn" data-bulk="max" aria-pressed="false">Max</button>
          </div>
        </div>
        <div class="list" id="gens"></div>
      </div>

      <div class="tabpane" id="pane-shop" hidden>
        <p class="hint">Bought with money, lost on a job hop. They unlock as your career gives you access to them.</p>
        <div class="filters">
          <input type="search" id="shop-q" placeholder="Search upgrades…" spellcheck="false" />
          <select id="shop-family"></select>
          <select id="shop-show">
            <option value="avail">Available</option>
            <option value="afford">Affordable now</option>
            <option value="owned">Owned</option>
            <option value="all">Everything</option>
          </select>
          <span class="counthint" id="shop-count"></span>
        </div>
        <div class="grid2" id="shop"></div>
      </div>

      <div class="tabpane" id="pane-branches" hidden>
        <p class="hint" id="branch-hint"></p>
        <div class="skillwrap">
          <div class="branchlist" id="branchlist"></div>
          <div class="treecol">
            <div id="branchhead"></div>
            <div class="zoombar">
              <button class="minibtn" id="zoom-out" title="Zoom out" aria-label="Zoom out">&minus;</button>
              <button class="minibtn" id="zoom-in" title="Zoom in" aria-label="Zoom in">+</button>
              <button class="minibtn" id="zoom-fit">Fit</button>
              <span class="zoomval num" id="zoom-val"></span>
            </div>
            <div class="treecanvas" id="treecanvas"></div>
            <div class="treedetail" id="treedetail"></div>
          </div>
        </div>
      </div>

      <div class="tabpane" id="pane-track" hidden><div id="track-body"></div></div>

      <div class="tabpane" id="pane-career" hidden>
        <p class="hint">Your ladder. Every promotion multiplies pay and output permanently &mdash; for this run.</p>
        <div class="list" id="ranks"></div>
      </div>

      <div class="tabpane" id="pane-awards" hidden>
        <p class="hint">Each award earned adds <b>+1%</b> to all code output, forever. <span id="ach-count" class="num"></span></p>
        <div class="grid2" id="awards"></div>
      </div>

      <div class="tabpane" id="pane-reset" hidden><div id="reset-body"></div></div>
    </div>
  </div>

  <div class="foot">Progress saves to this browser automatically.</div>
</div>

<div class="eventzone" id="eventzone"></div>
<div id="modal-root"></div>
`;
