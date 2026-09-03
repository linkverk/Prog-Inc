#!/usr/bin/env node
// PreToolUse nudge: when a graphify knowledge graph exists, orient with
// `graphify query` before falling back to raw grep/read.
//
// Usage: node graphify-gate.mjs <bash|read>
// Node is used deliberately instead of python3: on this machine `python3`
// resolves to the Windows Store stub, which exits 49 and silently no-ops.

import { existsSync } from 'node:fs';
import { join } from 'node:path';

const mode = process.argv[2];
const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();

const SEARCH_CMD = /\b(grep|rg|ripgrep|find|fd|ack|ag)\b/;
const SOURCE_EXT = /\.(py|js|ts|tsx|jsx|go|rs|java|rb|c|h|cpp|hpp|cc|cs|kt|swift|php|scala|lua|sh|md|rst|txt|mdx)\b/;

const MESSAGES = {
  bash:
    'MANDATORY: graphify-out/graph.json exists. You MUST run `graphify query "<question>"` ' +
    'before grepping raw files. Only grep after graphify has oriented you, or to modify/debug specific lines.',
  read:
    'MANDATORY: graphify-out/graph.json exists. You MUST run graphify before reading source files. ' +
    'Use: `graphify query "<question>"` (scoped subgraph), `graphify explain "<concept>"`, or ' +
    '`graphify path "<A>" "<B>"`. Only read raw files after graphify has oriented you, or to ' +
    'modify/debug specific lines. This rule applies to subagents too — include it in every ' +
    'subagent prompt involving code exploration.',
};

function matches(input) {
  if (mode === 'bash') return SEARCH_CMD.test(String(input.command || ''));
  const subject = [input.file_path, input.pattern, input.path]
    .filter(Boolean).join(' ').toLowerCase().replace(/\\/g, '/');
  return !subject.includes('graphify-out/') && SOURCE_EXT.test(subject);
}

let raw = '';
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(raw);
    const input = payload.tool_input || payload;
    if (!MESSAGES[mode] || !matches(input)) return;
    if (!existsSync(join(projectDir, 'graphify-out', 'graph.json'))) return;
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext: MESSAGES[mode],
      },
    }));
  } catch {
    // Never block a tool call because the nudge failed.
  }
});
