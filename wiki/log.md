# Log

Append-only, newest at the bottom. Entry prefix is fixed so
`grep "^## \[" wiki/log.md | tail -5` works.

## [2026-09-03] ingest | PLAN.md (v2 content & systems plan)
First source. Created `wiki/CLAUDE.md` schema, `pages/overview.md`, 8 branch entity pages,
3 concept pages (`currency-model`, `gateway-rule`, `faucet-antagonism`), `pages/sources/plan-md.md`,
and `tools/regen-entity-pages.mjs`. Drift policy left as an open TODO for the human.

## [2026-09-03] lint | bookkeeping gap
Schema mandates `index.md` and `log.md`; neither existed. Created both, back-filling the
2026-09-03 ingest from the pages on disk. Open findings: `wiki/raw/` empty; drift policy
undecided; four concepts referenced across pages with no page of their own (prestige loop,
rank ladder, shop upgrades, generator families).
