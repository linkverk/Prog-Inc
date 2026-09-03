/** Prints the real content counts so PLAN.md can be checked against reality. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BRANCHES = 8;

const rows = (f) => {
  const t = readFileSync(join(ROOT, "src/data", f), "utf8");
  return t.split("\n").filter((l) => l.startsWith("  {")).map((l) => JSON.parse(l.trim().replace(/,$/, "")));
};
const read = (f) => readFileSync(join(ROOT, "src/data", f), "utf8");

const skills = rows("skills.generated.ts");
const upgrades = rows("upgrades.generated.ts");

/* Awards and tools are authored TypeScript rather than generated JSON, so they are
 * counted by their shape in the source: cheap, and still checkable against the file. */
const achBody = read("achievements.ts").split("\n");
const listStart = achBody.findIndex((l) => l.startsWith("export const ACHIEVEMENTS"));
const body = achBody.slice(listStart);
const awards =
  body.filter((l) => /^  (at\(|\{$)/.test(l)).length +
  (body.some((l) => l.includes("...BRANCH_IDS.map")) ? BRANCHES : 0);
const secret = body.filter((l) => l.includes("secret: true")).length;
const withBar = body.filter((l) => /^  at\(/.test(l)).length + BRANCHES;
const tools = (read("generators.ts").match(/\{ id: "/g) || []).length;

const by = (arr, key) => arr.reduce((a, x) => ((a[x[key]] = (a[x[key]] || 0) + 1), a), {});

console.log("SKILLS", skills.length);
console.log("  gateways (one-time, no upgrades):", skills.filter((s) => s.gateway).length);
console.log("  upgradable:", skills.filter((s) => !s.gateway).length);
console.log("  purchasable levels:", skills.reduce((a, s) => a + s.maxLevel, 0));
console.log("  per branch:", by(skills, "branch"));
console.log("  per tier:", by(skills, "tier"));
console.log("  per effect kind:", by(skills, "kind"));
console.log("");
console.log("UPGRADES", upgrades.length);
console.log("  per family:", by(upgrades, "family"));
console.log("");
console.log("TOOLS", tools);
console.log("");
console.log("AWARDS", awards);
console.log("  with a progress bar:", withBar);
console.log("  hidden until earned:", secret);
