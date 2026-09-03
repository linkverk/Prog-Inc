# setupBase.md — Claude Code setup baseline

Single inventory of **every Claude Code setting, plugin, MCP server, hook and skill** backing this
app. `CLAUDE.md` routes *codebase* questions; this file describes the *tooling* around it.

Snapshot date: **2026-09-03**. Machine: Windows 11, Claude Code `installMethod: native`,
model Opus 5 (1M context), primary dir `D:\GitHub\KpopWebGame`.

Rebuild from zero → jump to [§11 Reproduce-from-zero](#11-reproduce-from-zero).
Not to be confused with [docs/setup.md](docs/setup.md), which covers service boot order and ports.

---

## 1. Settings layer stack

Settings cascade; later layers add to (never remove from) earlier ones.

| Layer | File | Committed? | Holds |
|---|---|---|---|
| User global | `~/.claude/settings.json` | no (outside repo) | env, permissions, hooks, statusLine, `enabledPlugins`, `extraKnownMarketplaces`, UI prefs |
| User global | `~/.claude.json` | no | MCP servers (global + per-project), `installMethod`, `autoUpdates` |
| Project | `.claude/settings.json` | **yes** | 3 PreToolUse hooks + 1 extra plugin |
| Project local | `.claude/settings.local.json` | machine-local | ~21 permission allow entries |
| Instructions | `CLAUDE.md`, `.claude/CLAUDE.md`, `~/.claude/CLAUDE.md` | root + `.claude` yes | auto-loaded every session |
| Memory | `~/.claude/projects/D--GitHub-KpopWebGame/memory/MEMORY.md` | no | per-project auto-memory index |

Truth for plugin *versions* is `~/.claude/plugins/installed_plugins.json` — **not** `settings.json`,
which only records enabled/disabled.

---

## 2. Global settings reference

From `~/.claude/settings.json`:

| Key | Value |
|---|---|
| `theme` | `dark` |
| `tui` | `fullscreen` |
| `effortLevel` | `high` |
| `autoUpdatesChannel` | `latest` |
| `agentPushNotifEnabled` | `true` |
| `env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | `1` |
| `statusLine` | `node C:/Users/Gebruiker/.claude/hud/omc-hud.mjs` |
| `permissions.additionalDirectories` | `C:\Users\Gebruiker\.claude\projects\d--GitHub-OFM\memory` |

From `~/.claude.json`: `installMethod: native`, `autoUpdates: false`.

---

## 3. Plugins

**20 installed, 19 enabled** globally (+1 enabled at repo level). Versions that look like a hex
string are git SHA pins from the official marketplace.

| Plugin | Marketplace | Version | State |
|---|---|---|---|
| `oh-my-claudecode` | omc | 4.13.5 | enabled |
| `claude-mem` | thedotmack | 13.24.0 | enabled |
| `caveman` | caveman | `18e45320a0b1` | enabled |
| `ecc` | ecc | 2.0.0-rc.1 | enabled |
| `telegram` | claude-plugins-official | 0.0.7 | enabled |
| `base44` | claude-plugins-official | 1.0.0-beta.1 | enabled |
| `claude-code-setup` | claude-plugins-official | 1.0.0 | enabled |
| `agent-sdk-dev` | claude-plugins-official | `0120fb83da5d` | enabled |
| `ai-plugins` | claude-plugins-official | `2de00883bd2b` | enabled |
| `feature-dev` | claude-plugins-official | `0120fb83da5d` | enabled |
| `figma` | claude-plugins-official | 2.2.107 | enabled |
| `firecrawl` | claude-plugins-official | 1.0.9 | enabled |
| `code-review` | claude-plugins-official | `0120fb83da5d` | enabled |
| `frontend-design` | claude-plugins-official | `0120fb83da5d` | enabled |
| `code-modernization` | claude-plugins-official | `0120fb83da5d` | enabled |
| `huggingface-skills` | claude-plugins-official | 1.0.26 | enabled |
| `learning-output-style` | claude-plugins-official | 1.0.0 | enabled |
| `playground` | claude-plugins-official | `0120fb83da5d` | enabled |
| `typescript-lsp` | claude-plugins-official | 1.0.0 | enabled |
| `github` | claude-plugins-official | `0120fb83da5d` | **disabled** |
| `security-guidance` | claude-plugins-official | — | enabled **by repo** `.claude/settings.json` |

The four that shape day-to-day behavior here: **caveman** (terse output), **oh-my-claudecode**
(executor/planner/architect/reviewer agents), **ecc** (hook gates + large skill catalogue),
**claude-mem** (session memory + `mem-search`).

### Marketplaces

| Name | Source | Note |
|---|---|---|
| `omc` | git `https://github.com/yeachan-heo/oh-my-claudecode.git` | |
| `thedotmack` | github `thedotmack/claude-mem` | `autoUpdate: true` |
| `caveman` | github `JuliusBrussee/caveman` | |
| `ecc` | git `https://github.com/affaan-m/everything-claude-code.git` | |
| `claude-plugins-official` | github `anthropics/claude-plugins-official` | |
| `claude-code-plugins-plus` | github `jeremylongshore/claude-code-plugins` | registered, nothing installed |
| `claude-code-toolkit` | github `rohitg00/awesome-claude-code-toolkit` | registered, nothing installed |

Install cache: `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`.

---

## 4. MCP servers

| Server | Scope | Command |
|---|---|---|
| `context7` | global | `npx -y @upstash/context7-mcp` |
| `codegraph` | global | `codegraph serve --mcp` |
| `caveman-shrink` | project `D:/GitHub/KpopWebGame` | `npx -y caveman-shrink` |

Plugin-bundled servers surface as `mcp__plugin_<plugin>_<server>__*`:

- **ecc** → context7, exa, github, memory, playwright, sequential-thinking
- **claude-mem** → `mcp-search` (`search`, `timeline`, `get_observations`, corpus tools)
- **oh-my-claudecode** → `t` (LSP, notepad, wiki, state, ast-grep, python_repl)
- **figma**, **huggingface-skills** → their own servers

`codegraph` keeps a live SQLite index in `.codegraph/codegraph.db` plus a watcher daemon
(`.codegraph/daemon.pid`, currently untracked in git status). CLI lives at
`~/AppData/Roaming/npm/codegraph`. Prefer `codegraph_explore` over grep for "how does X work".

---

## 5. Hooks

### Global (`~/.claude/settings.json`)

| Event | Command | Effect |
|---|---|---|
| `SessionStart` | `node ~/.claude/hooks/caveman-activate.js` | injects caveman-mode instructions, level `full` |
| `UserPromptSubmit` | `node ~/.claude/hooks/caveman-mode-tracker.js` | tracks `/caveman lite\|full\|ultra` switches |
| `statusLine` | `node ~/.claude/hud/omc-hud.mjs` | OMC HUD status line |

Hook scripts live in `~/.claude/hooks/`: `caveman-activate.js`, `caveman-config.js`,
`caveman-mode-tracker.js`, `caveman-stats.js`, `caveman-statusline.{ps1,sh}`.

### Project (`.claude/settings.json`, committed)

Both are `PreToolUse`, and both call `.claude/hooks/graphify-gate.mjs` (Node, no Python):

1. **`Bash`** — if the command contains `grep`/`rg`/`find`/`fd`/`ack`/`ag` **and**
   `graphify-out/graph.json` exists, injects "run `graphify query` first".
2. **`Read|Glob`** — same nudge for source-file extensions outside `graphify-out/`.

Both are no-ops until `graphify-out/graph.json` exists; see [§10](#10-known-gaps--drift).

### Plugin-injected (not in any settings file)

- **ECC GateGuard** — "fact-forcing gate": before the first `Bash` of a session, and before
  `Write`/`Edit` on a file, it blocks once and demands stated facts; retry then passes.
  Disable with `ECC_GATEGUARD=off` or `ECC_DISABLED_HOOKS=pre:bash:gateguard-fact-force`.
- ECC advisory reminders on `Bash`/`Read`/`Glob` ("run in parallel", "use background for installs").
- claude-mem session-start context digest.

---

## 6. Skills

### Repo-local — `.claude/skills/`
- **`graphify`** — knowledge-graph builder/query (`SKILL.md` + 8 refs: query, update, hooks,
  exports, extraction-spec, add-watch, github-and-merge, transcribe). Triggered by `/graphify`.
- **`tech-debt-audit`**

### Global — `~/.claude/skills/` (4 dirs)
`graphify`, `tech-debt-audit`, `learned`, `omc-learned`. The gstack suite that used to live here
(54 dirs) was removed on 2026-09-03 along with its `~/.gstack/` config and the Skill gate; nothing
in this repo depends on it.

Plugin skills (ecc, omc, caveman, claude-mem, code-modernization, figma, firecrawl,
huggingface-skills, …) are listed by the harness at session start; they live in the plugin cache,
not in `~/.claude/skills/`.

---

## 7. Permissions (summary)

Permissions are pre-approved command patterns. Two lists apply here.

**Repo — `.claude/settings.local.json`** (~21 entries, this project only):

| Category | Examples |
|---|---|
| Node/npm | `npm run *`, `npm i *`, `npx playwright *` |
| Test/e2e | `node scripts/_playtest.mjs`, playwright resolve check |
| Backend | `dotnet build backend-csharp` via PowerShell, `python -c "import ast; ast.parse('main.py')"` |
| API probes | `curl` against `localhost:5000` (`/api/players`, `/api/idols`, `/api/cards/catalog`) |
| Git/GitHub | `gh repo *` |
| Reads | `/tmp/**`, `/d/AI/.claude/**` |
| claude-mem | `worker-cli.js --help` / `restart` |

**Global — `~/.claude/settings.json`** (~100 entries, **cross-project**; most belong to OFM,
VoiceoverPetProject or ComfyUI, not this repo):

| Category | Examples |
|---|---|
| .NET | `dotnet build *`, `dotnet ef *`, `dotnet list *`, `npx tsc *` |
| Python | pytest across several venvs, `pip install *`, `python -c ' *` |
| Git | `git add/commit/stash/rm/clone *`, `git check-ignore *` |
| Plugins | `claude plugin *` |
| Web | `WebSearch`, `WebFetch` for github.com, gist.github.com, raw.githubusercontent.com |
| MCP | all 8 `mcp__codegraph__*` tools |
| Other repos | ComfyUI venv/pip/model-download, spec-kit `specify init`, ffmpeg/ffprobe |

Nothing is denied explicitly; everything not listed falls through to a normal prompt.

---

## 8. Behavior rules in force

Configured elsewhere, listed here so the picture is complete — details stay in their own files.

| Rule | Source |
|---|---|
| Caveman mode, level `full` — terse output, code/commits/PRs in normal prose | SessionStart hook + [CLAUDE.md](CLAUDE.md) |
| Learning output style — educational insights, invites user code contributions | `learning-output-style` plugin |
| Prefer OMC skills/agents over ad-hoc work | [CLAUDE.md](CLAUDE.md) |
| `/browse` for all web browsing; never `mcp__claude-in-chrome__*` | [CLAUDE.md](CLAUDE.md) |
| graphify-first before grepping source | [CLAUDE.md](CLAUDE.md) + repo hooks (inert, §10) |
| PLAN.md read at session start → migrate outcomes into [TASKS.md](TASKS.md) | [CLAUDE.md](CLAUDE.md) |
| Wiki discipline — update `wiki/` + append to [wiki/log.md](wiki/log.md) | [CLAUDE.md](CLAUDE.md) |
| Task IDs `<phase>.<n>`; letters A–Z retired; next new plan is Phase 6 | [CLAUDE.md](CLAUDE.md), [TASKS.md](TASKS.md) |

---

## 9. What is *not* in the repo

`.gitignore` excludes local tooling state, so a fresh clone is incomplete:

- `.omc/` (`.gitignore:2`) — OMC plans, sessions, project memory, state

Also outside the repo entirely: `~/.claude/settings.json`, `~/.claude.json`, `~/.claude/hooks/`,
`~/.claude/hud/`, the plugin cache, and per-project auto-memory.

---

## 10. Known gaps / drift

| # | Issue | Impact | Fix |
|---|---|---|---|
| 1 | `graphify-out/` does not exist, though `CLAUDE.md` and two hooks assume it | graphify-first rules are dead letters | run `graphify .` to build the graph, or drop the rule |
| 2 | `python3` is the Windows Store stub (exit 49) | any Python-based tooling fails; the graphify hooks were moved to Node and are unaffected | use `py -3.11` when Python is needed |
| 3 | OMC 4.13.5 installed, 5.1.0 available | missing fixes/skills | `omc update` (syncs plugin + npm + CLAUDE.md) |
| 4 | Global permission list is cross-project | grants unrelated to this repo stay approved here | prune, or move repo-specific entries down to `settings.local.json` |

---

## 11. Reproduce-from-zero

Order matters: marketplaces → plugins → MCP → codegraph.

```powershell
# 1. Marketplaces
claude plugin marketplace add https://github.com/yeachan-heo/oh-my-claudecode.git
claude plugin marketplace add thedotmack/claude-mem
claude plugin marketplace add JuliusBrussee/caveman
claude plugin marketplace add https://github.com/affaan-m/everything-claude-code.git
# claude-plugins-official is auto-registered

# 2. Plugins (github@claude-plugins-official stays disabled)
claude plugin install oh-my-claudecode@omc
claude plugin install claude-mem@thedotmack
claude plugin install caveman@caveman
claude plugin install ecc@ecc
foreach ($p in @('telegram','base44','claude-code-setup','agent-sdk-dev','ai-plugins',
                 'feature-dev','figma','firecrawl','code-review','frontend-design',
                 'code-modernization','huggingface-skills','learning-output-style',
                 'playground','typescript-lsp','security-guidance')) {
  claude plugin install "$p@claude-plugins-official"
}

# 3. MCP servers
claude mcp add context7 -- npx -y "@upstash/context7-mcp"
claude mcp add codegraph -- codegraph serve --mcp
claude mcp add -s project caveman-shrink -- npx -y caveman-shrink
```

```bash
# 4. codegraph index for this repo
npm i -g codegraph   # if `codegraph` is not on PATH
codegraph index .
```

Then copy the global prefs from §2 into `~/.claude/settings.json` and restart Claude Code.
`.claude/settings.json` (hooks + `security-guidance`) comes with the clone;
`.claude/settings.local.json` is machine-local and rebuilt by approving prompts as they appear.

### Verify the setup

```bash
node -e "const p=require(process.env.USERPROFILE+'/.claude/plugins/installed_plugins.json').plugins; for(const [k,v] of Object.entries(p)) console.log(k,(v.find(x=>x.scope==='user')||v[0]).version)"
node -e "console.log(Object.keys(require(process.env.USERPROFILE+'/.claude.json').mcpServers))"
codegraph status
```
