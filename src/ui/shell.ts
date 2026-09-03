/** The static skeleton: HUD, sidebar, the page host, the quick dock, overlays. Pages mount into #pages. */
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

<div class="body">
  <nav class="sidenav" id="nav" aria-label="Pages">
    <div class="navlist" id="navlist"></div>
    <button class="navbtn navmore" id="navmore"><span class="ng">&#8943;</span><span class="nl">More</span></button>
    <div class="dock" id="dock" hidden>
      <button class="dockbtn" id="dock-code">Write code <span class="per num" id="dock-per">+1</span></button>
      <button class="minibtn" id="dock-debug">Squash</button>
    </div>
  </nav>

  <main class="pages" id="pages">
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
  </main>
</div>

<div class="eventzone" id="eventzone"></div>
<div class="toasts" id="toasts"></div>
<div id="modal-root"></div>
`;
