/** Prints the real content counts so PLAN.md can be checked against reality. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const rows = (f) => {
  const t = readFileSync(join(ROOT, "src/data", f), "utf8");
  return t.split("\n").filter((l) => l.startsWith("  {")).map((l) => JSON.parse(l.trim().replace(/,$/, "")));
};

const skills = rows("skills.generated.ts");
const upgrades = rows("upgrades.generated.ts");

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
