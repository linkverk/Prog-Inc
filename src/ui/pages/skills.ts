/** The tree, unchanged: web and layers, search, the detail panel. See treetab.ts. */

import type { Page } from "../router";
import { initTree, renderTree } from "../treetab";

const HTML = `
<p class="hint" id="tree-hint"></p>
<div class="filters">
  <input type="search" id="tree-q" placeholder="Search every layer" spellcheck="false" />
  <select id="tree-mode">
    <option value="all">No lens</option>
    <option value="avail">Available</option>
    <option value="afford">Affordable now</option>
    <option value="owned">Owned</option>
  </select>
  <span class="counthint" id="tree-count"></span>
</div>
<div class="tresults" id="tree-results"></div>
<div class="skillwrap">
  <div class="treeside">
    <div class="treedetail" id="treedetail"></div>
    <div class="layerlist" id="layerlist"></div>
  </div>
  <div class="treecol">
    <div id="layerhead"></div>
    <div class="zoombar">
      <span class="modeswitch" id="tree-mode-switch">
        <button class="minibtn" data-mode="web">Web</button>
        <button class="minibtn" data-mode="layers">Layers</button>
      </span>
      <button class="minibtn" id="zoom-out" title="Zoom out" aria-label="Zoom out">&minus;</button>
      <button class="minibtn" id="zoom-in" title="Zoom in" aria-label="Zoom in">+</button>
      <button class="minibtn" id="zoom-fit">Fit</button>
      <span class="zoomval num" id="zoom-val"></span>
      <span class="modeswitch" id="tree-density">
        <button class="minibtn" data-density="tight">Tight</button>
        <button class="minibtn" data-density="normal">Roomy</button>
      </span>
      <span class="modeswitch" id="tree-bulk" title="How many a node's button buys (B on the keyboard, Shift+B for max)">
        <button class="minibtn" data-bulk="1">&times;1</button>
        <button class="minibtn" data-bulk="10">&times;10</button>
        <button class="minibtn" data-bulk="max">Max</button>
      </span>
      <span class="legend" id="tree-fams"></span>
    </div>
    <div class="treecanvas" id="treecanvas"></div>
  </div>
</div>
`;

export const page: Page = {
  id: "skills",
  label: "Skills",
  glyph: "⌬",
  html: HTML,
  init(ctx) {
    initTree(ctx.changed);
  },
  render: renderTree,
};
