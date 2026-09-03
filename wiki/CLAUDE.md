# Wiki schema — Zero to Ten-X game design

You are the maintainer of this wiki. The human curates sources, asks questions, and
decides what matters. You do all the writing, filing, cross-referencing and bookkeeping.

Pattern source: Karpathy's `llm-wiki.md` idea file (gist `442a6bf555914893e9891c11519de94f`,
Apr 4 2026). This file is the instantiation of it for this repo.

## Layers

| layer | path | who writes |
|---|---|---|
| raw sources | `wiki/raw/` | the human only. **Immutable — never edit or delete a raw file.** |
| the wiki | `wiki/pages/` | you only. The human reads it. |
| schema | `wiki/CLAUDE.md` (this file) | both, co-evolved as conventions settle |

The game's own source (`src/`, `scripts/`, `PLAN.md`) is a **fourth, special layer**: it is
raw material you may read, but it lives outside `wiki/` and you never treat it as immutable —
it is the thing the wiki is *about*, and it changes.

## Page types

- `pages/overview.md` — the single entry point. What the game is, current state, open questions.
- `pages/entities/<id>.md` — one per branch, currency, track, rank ladder, generator family.
  Named by the id used in code (`algorithms`, not `Algorithms`) so a page maps 1:1 to data.
- `pages/concepts/<slug>.md` — mechanics and design arguments that span entities
  (`currency-model`, `gateway-rule`, `faucet-antagonism`, `prestige-loop`).
- `pages/sources/<slug>.md` — one per ingested raw source: what it is, what it claims,
  what changed in the wiki because of it.

Every page opens with YAML frontmatter so Obsidian Dataview can query it:

```yaml
---
type: entity | concept | source
id: algorithms
updated: 2026-09-03
sources: [plan-md]
code: [src/data/branches.ts, src/core/engine.ts]
---
```

`code:` is the field that makes this wiki different from a generic one — it pins each claim
to the file that can prove or falsify it.

## Conventions

- Link with `[[wiki-links]]`, always. A page nobody links to is a bug (see Lint).
- **Every quantitative claim carries its provenance**: either a `src/...:line` reference or
  the command that prints it (`npm run gen`, `npm run stats`). A number with no provenance
  is a claim, not a fact — mark it `(unverified)`.
- Prose describes intent; tables carry numbers. Never restate a table in prose.
- British/American spelling: match `PLAN.md` (British — "specialisation").

## Operations

### Ingest

1. Read the raw source end to end. Do not skim.
2. Discuss the takeaways with the human before writing anything.
3. Write `pages/sources/<slug>.md` — summary, key claims, and what it contradicts.
4. Update every entity and concept page the source touches. A real source touches 5–15 pages.
5. Update `index.md`.
6. Append one line to `log.md`.

### Query

1. Read `index.md` first. Do not grep the whole wiki — the index exists to be the router.
2. Drill into the pages the index points at; read the `code:` files when a number is at stake.
3. Answer with citations to wiki pages and to `src/...:line`.
4. **File the good answers back.** A comparison, a balance analysis, a discovered
   contradiction — these become pages. An answer that only lives in chat is lost work.

### Lint

Run on request, and always after a batch ingest. Report, don't silently fix.

- contradictions between pages
- stale claims a newer source superseded
- orphan pages (no inbound `[[link]]`)
- concepts mentioned repeatedly but with no page of their own
- missing cross-references
- gaps a web search could fill
- **drift**: any wiki number that no longer matches what the code prints

<!--
TODO (human): drift policy — the one rule an agent cannot pick for you.

This wiki documents a codebase that changes under it. When a wiki page says
"2 316 levels" and `npm run gen` prints something else, what should happen?

Write the policy here, 5–10 lines. The trade-offs:

  - Auto-correct on sight: wiki is always true to code, but a deliberate design
    intent silently becomes whatever the code drifted to. PLAN.md §0 says the
    opposite — "if code and this file disagree, the code is the bug".
  - Flag only, never touch: intent survives, but stale numbers accumulate and
    readers stop trusting the wiki.
  - Split the difference: auto-correct generated/derived counts (things
    gen-content.mjs computes), flag anything that is an authored design target
    (balance timings, tier caps) for a human call.

Decide which numbers are code's to own and which are the designer's. That
boundary is the whole policy.
-->

## Indexing and logging

- `index.md` — content catalog. Every page, one line, with its one-line summary. Updated on
  every ingest. This is what you read first on a query, before any search.
- `log.md` — append-only, newest at the bottom. Entry prefix is fixed:
  `## [YYYY-MM-DD] ingest | Title` (or `query` / `lint`) so
  `grep "^## \[" wiki/log.md | tail -5` works.

## Scale note

At the current size the index is enough — no embedding search, no vector store. Revisit
only past roughly 100 sources; `qmd` (local hybrid BM25/vector, has an MCP server) is the
intended next step, not a bespoke pipeline.
