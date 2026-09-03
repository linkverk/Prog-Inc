// Regenerates wiki/pages/entities/*.md from src/data/branches.ts.
// WARNING: overwrites those files wholesale — hand-written sections (e.g. the Antagonism
// block on craft.md and security.md) are lost. Re-append after running, or move prose to
// a concept page instead. Run from repo root: node wiki/tools/regen-entity-pages.mjs

import { readFileSync, writeFileSync } from "node:fs";
const src = readFileSync("src/data/branches.ts", "utf8");
const re = /id:\s*"(\w+)",\s*name:\s*"([^"]+)",\s*curName:\s*"([^"]+)",\s*sym:\s*"([^"]+)",\s*blurb:\s*"([^"]+)",\s*faucet:\s*"([^"]+)",\s*gateCost:\s*(\d+)/g;
const date = "2026-09-03";
let m, n = 0;
while ((m = re.exec(src))) {
  const [, id, name, cur, sym, blurb, faucet, cost] = m;
  const body = `---
type: entity
id: ${id}
updated: ${date}
sources: [plan-md]
code: [src/data/branches.ts, src/data/skills.generated.ts, src/ui/branches.ts]
---

# ${name}

> ${blurb}

| field | value |
|---|---|
| branch id | \`${id}\` |
| currency | ${cur} (\`${sym}\`) |
| gateway cost | ${cost} KP |
| faucet | ${faucet} |

Every field above is read straight out of \`src/data/branches.ts\` — if this page and the
data disagree, the page is stale.

## Content

Same shape as every branch: 3 sub-path gateways plus 33 upgradable skills across 5 tiers,
289 purchasable levels. See [[gateway-rule]] for the tier table.

## Faucet

${faucet} The currency does not accrue at all until the ${cost} KP gateway is bought — see
[[currency-model]].

## Notes

_Nothing ingested yet beyond [[plan-md]]. Add sources and this section fills in._
`;
  writeFileSync(`wiki/pages/entities/${id}.md`, body);
  n++;
}
console.log("wrote", n, "entity pages");
