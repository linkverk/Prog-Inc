/**
 * Content generator.
 *
 * Authored name/effect pools in, two committed TypeScript data files out:
 *   src/data/skills.generated.ts    — 300 skills across 8 branches
 *   src/data/upgrades.generated.ts  — ~450 shop upgrades
 *
 * Run with `npm run gen`. The output is deterministic: no randomness, no timestamps,
 * so regenerating produces a byte-identical file and diffs stay readable.
 *
 * See PLAN.md §3 and §4 for the design this implements.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src", "data");

/* ------------------------------------------------------------------ *
 *  Skills
 * ------------------------------------------------------------------ */

const MACHINES = ["notepad", "ide", "ci", "pair", "farm", "swarm"];
const PEOPLE = ["duck", "so", "junior", "oss"];
const PIPELINE = ["snips", "tests", "ci", "farm"];

/** tier -> [cost of level 1, cost growth, max level] */
const TIER_SHAPE = {
  1: [8, 1.42, 12],
  2: [95, 1.5, 10],
  3: [1500, 1.58, 8],
  4: [24000, 1.68, 6],
  5: [420000, 2.2, 3],
};

/** how strong one level of each kind is, by tier */
const POWER = {
  output: [0.06, 0.09, 0.13, 0.19, 0.32],
  clickPower: [0.14, 0.2, 0.28, 0.4, 0.65],
  clickPct: [0.0015, 0.003, 0.006, 0.012, 0.025],
  income: [0.08, 0.12, 0.17, 0.25, 0.4],
  knowledge: [0.07, 0.11, 0.16, 0.23, 0.38],
  genGroup: [0.1, 0.15, 0.22, 0.32, 0.5],
  bugSlow: [0.04, 0.06, 0.085, 0.12, 0.2],
  bugSoften: [0.035, 0.055, 0.08, 0.11, 0.18],
  debugPower: [0.12, 0.18, 0.26, 0.36, 0.6],
  autoClean: [0.0012, 0.0022, 0.0038, 0.006, 0.011],
  cheaper: [0.012, 0.02, 0.03, 0.045, 0.075],
  offline: [0.03, 0.05, 0.08, 0.12, 0.2],
  luck: [0.05, 0.08, 0.12, 0.18, 0.3],
  currency: [0.09, 0.14, 0.2, 0.3, 0.5],
  crossCurrency: [0.07, 0.11, 0.16, 0.24, 0.4],
};

/**
 * Each branch supplies 33 skill names split 8 / 8 / 8 / 6 / 3 across tiers 1..5,
 * three sub-path gateway names, and the rotation of effect kinds that gives the
 * branch its character.
 */
const BRANCH_CONTENT = {
  algorithms: {
    gate: ["Algorithmic Thinking", "Stop guessing. Start reasoning about what the machine will actually do."],
    subs: [
      ["Open: Combinatorics", "Counting, ordering, and the structures underneath both."],
      ["Open: Advanced Structures", "The data structures that make hard problems easy."],
      ["Open: Theory", "Where the field runs out of known answers."],
    ],
    kinds: ["clickPower", "output", "clickPct", "currency", "clickPower", "output", "crossCurrency", "clickPower"],
    cross: "research",
    t1: ["Loops", "Recursion", "Binary Search", "Hash Maps", "Sorting Networks", "Two Pointers", "Sliding Window", "Amortised Analysis"],
    t2: ["Dynamic Programming", "Greedy Proofs", "Graph Traversal", "Union-Find", "Heaps & Priority Queues", "Bit Manipulation", "Memoisation", "Divide & Conquer"],
    t3: ["Suffix Automata", "Max-Flow Min-Cut", "Segment Trees", "Convex Hull Trick", "Number Theory", "Randomised Algorithms", "Approximation Bounds", "Cache-Oblivious Design"],
    t4: ["Linear Programming", "Spectral Methods", "Streaming Algorithms", "Parameterised Complexity", "Quantum-Inspired Search", "Proof by Induction"],
    t5: ["P versus NP Intuition", "Optimal Substructure", "Closed Form For Everything"],
  },
  systems: {
    gate: ["Systems Literacy", "The machine is not a mystery. It is a stack of things you can read."],
    subs: [
      ["Open: Concurrency", "Two things at once, correctly."],
      ["Open: Distribution", "Many machines pretending to be one."],
      ["Open: Bare Metal", "Below the runtime, below the kernel."],
    ],
    kinds: ["genGroup", "output", "offline", "currency", "genGroup", "output", "crossCurrency", "genGroup"],
    cross: "data",
    gens: MACHINES,
    t1: ["Bash Scripting", "Cron Jobs", "Process Supervision", "File Descriptors", "Pipes & Redirection", "Service Units", "Log Rotation", "Shell Functions"],
    t2: ["Concurrency", "Thread Pools", "Memory Mapping", "Zero-Copy I/O", "Event Loops", "Backpressure", "Connection Pooling", "Batch Windows"],
    t3: ["Distributed Locks", "Consensus Protocols", "Sharding", "Replication Lag", "Idempotent Retries", "Circuit Breakers", "Load Shedding", "Cell Architecture"],
    t4: ["NUMA Awareness", "Kernel Bypass", "Custom Allocators", "Lock-Free Queues", "Hardware Counters", "Bare-Metal Scheduling"],
    t5: ["Planet-Scale Routing", "Nine Nines", "The Machine That Never Stops"],
  },
  craft: {
    gate: ["Craftsmanship", "Quality is not a phase at the end. It is how fast you go."],
    subs: [
      ["Open: Testing", "Confidence you can run on demand."],
      ["Open: Review Culture", "Two pairs of eyes, one standard."],
      ["Open: Verification", "Proof instead of hope."],
    ],
    kinds: ["bugSlow", "debugPower", "bugSoften", "currency", "autoClean", "output", "crossCurrency", "bugSlow"],
    cross: "community",
    t1: ["Naming Things", "Small Functions", "Guard Clauses", "Consistent Formatting", "Meaningful Commits", "Pull Request Hygiene", "Readable Diffs", "Dead Code Removal"],
    t2: ["Unit Testing", "Property Testing", "Golden Files", "Test Fixtures", "Mutation Testing", "Coverage Gates", "Flake Hunting", "Fast Feedback"],
    t3: ["Code Review", "Pair Review", "Design Documents", "Refactoring Catalogue", "Dependency Hygiene", "Contract Tests", "Static Analysis", "Type Coverage"],
    t4: ["Formal Specification", "Model Checking", "Fuzzing At Scale", "Chaos Drills", "Deterministic Builds", "Provable Invariants"],
    t5: ["Zero Known Defects", "The Codebase Reads Itself", "Nothing Ever Breaks"],
  },
  business: {
    gate: ["Commercial Sense", "Someone is paying for this. Understand who, and why."],
    subs: [
      ["Open: Selling", "Talking about the work without flinching."],
      ["Open: Products", "Stop trading hours. Start shipping units."],
      ["Open: Ownership", "The part of the company that is yours."],
    ],
    kinds: ["income", "cheaper", "output", "currency", "income", "cheaper", "crossCurrency", "income"],
    cross: "algorithms",
    t1: ["Time Tracking", "Invoicing", "Scope Control", "Honest Estimates", "Client Communication", "Contract Reading", "Rate Card", "Retainer Terms"],
    t2: ["Negotiation", "Positioning", "Case Studies", "Referral Network", "Value Pricing", "Upselling", "Renewal Motion", "Payment Terms"],
    t3: ["Productising", "Licensing", "Channel Partners", "Enterprise Sales", "Support Contracts", "Usage Billing", "Land And Expand", "Margin Discipline"],
    t4: ["Equity Negotiation", "Board Reporting", "Fundraising", "Acquisition Terms", "Option Refresh", "Secondary Sale"],
    t5: ["Ownership", "The Cap Table", "Never Trading Hours Again"],
  },
  data: {
    gate: ["Data Literacy", "The system already knows. You just have to ask it properly."],
    subs: [
      ["Open: Pipelines", "Moving it reliably, on a schedule."],
      ["Open: Streaming", "Answering before the question is finished."],
      ["Open: Scale", "When the table does not fit anywhere."],
    ],
    kinds: ["output", "knowledge", "genGroup", "currency", "output", "knowledge", "crossCurrency", "output"],
    cross: "systems",
    gens: PIPELINE,
    t1: ["CSV Wrangling", "SQL Basics", "Indexing", "Query Plans", "Joins That Work", "Aggregation", "Window Functions", "Type Discipline"],
    t2: ["ETL Pipelines", "Schema Design", "Partitioning", "Columnar Storage", "Incremental Loads", "Data Contracts", "Backfills", "Late-Arriving Data"],
    t3: ["Stream Processing", "Exactly-Once Delivery", "Feature Stores", "Lakehouse Layout", "Query Federation", "Cost Attribution", "Lineage Tracking", "Semantic Layer"],
    t4: ["Vector Indexes", "Petabyte Scans", "Adaptive Compression", "Learned Indexes", "Real-Time OLAP", "Zero-ETL"],
    t5: ["Every Question Answerable", "The Warehouse Is The Product", "Signal Without Noise"],
  },
  security: {
    gate: ["Adversarial Mindset", "Read every line as if someone is trying to make it lie."],
    subs: [
      ["Open: Offensive Basics", "The first rung of actually breaking things."],
      ["Open: Exploitation", "From a crash to a shell."],
      ["Open: Research", "Finding what nobody has found yet."],
    ],
    kinds: ["bugSlow", "output", "income", "currency", "bugSlow", "output", "crossCurrency", "income"],
    cross: "craft",
    /* security wants MORE defects: negative bugSlow power raises the rate on purpose */
    invertBugs: true,
    t1: ["Threat Modelling", "Input Validation", "Secrets Handling", "Least Privilege", "Dependency Audits", "Log Redaction", "Auth Fundamentals", "Session Hygiene"],
    t2: ["Static Scanning", "Fuzz Harnesses", "Reverse Engineering", "Memory Safety Bugs", "Race Conditions", "Deserialisation Bugs", "Request Forgery", "Path Traversal"],
    t3: ["Privilege Escalation", "Kernel Exploits", "Sandbox Escapes", "Side Channels", "Supply Chain Attacks", "Cryptanalysis", "Firmware Extraction", "Hypervisor Bugs"],
    t4: ["Zero-Day Research", "Exploit Chaining", "Mitigation Bypass", "Persistent Implants", "Hardware Fault Injection", "Nation-State Tooling"],
    t5: ["Named In The CVE", "The Bug Nobody Else Saw", "Ghost In The Machine"],
  },
  community: {
    gate: ["Showing Up", "The work is only half of it. The other half is other people."],
    subs: [
      ["Open: Teaching", "Turning what you know into what they know."],
      ["Open: Stewardship", "Looking after something bigger than your commits."],
      ["Open: Legacy", "What keeps going after you stop."],
    ],
    kinds: ["luck", "knowledge", "genGroup", "currency", "output", "luck", "crossCurrency", "knowledge"],
    cross: "business",
    gens: PEOPLE,
    t1: ["Answering Questions", "Writing Issues Well", "Good First Issues", "Changelogs", "Release Notes", "Code Of Conduct", "Triage Rota", "Saying Thank You"],
    t2: ["Documentation", "Tutorials", "Conference Talks", "Meetup Hosting", "A Newsletter", "Podcast Guest", "Live Streaming", "Office Hours"],
    t3: ["Mentoring", "Maintainer Handoff", "Governance Model", "Funding The Project", "Working Groups", "Standards Participation", "Localisation", "Accessibility Advocacy"],
    t4: ["Foundation Seat", "Ecosystem Stewardship", "Conference Keynote", "Curriculum Design", "Grant Programme", "Fellowship"],
    t5: ["A Generation Learned From You", "The Community Runs Itself", "Everyone Knows The Name"],
  },
  research: {
    gate: ["Research Practice", "Read, reproduce, question. Then write something nobody has."],
    subs: [
      ["Open: Method", "Doing it so someone else could do it again."],
      ["Open: Theory", "Results that hold without an experiment."],
      ["Open: Legacy", "Work measured in decades."],
    ],
    kinds: ["knowledge", "output", "currency", "crossCurrency", "knowledge", "clickPct", "crossCurrency", "output"],
    cross: "algorithms",
    t1: ["Reading Papers", "Reproducing Results", "Literature Reviews", "Structured Notes", "Hypothesis Framing", "Honest Baselines", "Ablations", "Experiment Logs"],
    t2: ["Novel Benchmarks", "Peer Review", "Preprints", "Collaboration", "Grant Writing", "Reproducible Artifacts", "Negative Results", "Survey Papers"],
    t3: ["New Formalism", "Complexity Bounds", "Impossibility Results", "Constructive Proofs", "Cross-Disciplinary Work", "Theory To Practice", "Open Problems", "Long Horizons"],
    t4: ["Field-Defining Paper", "Award Committee", "Lab Direction", "Decade-Long Programme", "Textbook Authorship", "A Named Conjecture"],
    t5: ["The Theorem Bears Your Name", "A Field Reorganised", "Proof Beyond Doubt"],
  },
};

const BRANCH_ORDER = Object.keys(BRANCH_CONTENT);

const GATE_COST = {
  algorithms: 40, systems: 40, craft: 90, business: 90,
  data: 320, security: 320, community: 1400, research: 1400,
};

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function pct(x) {
  const v = x * 100;
  return (v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : Math.round(v).toString()) + "%";
}

/** Human sentence for one level of an effect. */
function describe(kind, power, ctx) {
  switch (kind) {
    case "output": return `+${pct(power)} to all code output per level.`;
    case "clickPower": return `+${pct(power)} click power per level.`;
    case "clickPct": return `Each click also yields ${pct(power)} of your LOC/s per level.`;
    case "income": return `+${pct(power)} income per level.`;
    case "knowledge": return `+${pct(power)} knowledge gain per level.`;
    case "genGroup": return `+${pct(power)} output from ${ctx.gensLabel} per level.`;
    case "bugSlow":
      return power < 0
        ? `Bugs surface ${pct(-power)} faster per level — more findings to sell.`
        : `Bugs appear ${pct(power)} slower per level.`;
    case "bugSoften": return `Bugs throttle you ${pct(power)} less per level.`;
    case "debugPower": return `+${pct(power)} bugs closed per debug session, per level.`;
    case "autoClean": return `Cleans up ${pct(power)} of your output as bug fixes, per level.`;
    case "cheaper": return `Tools cost ${pct(power)} less per level.`;
    case "offline": return `+${pct(power)} offline earning rate and +1h cap per level.`;
    case "luck": return `Opportunities arrive ${pct(power)} more often per level.`;
    case "currency": return `+${pct(power)} ${ctx.curName} gain per level.`;
    case "crossCurrency": return `+${pct(power)} ${ctx.crossName} gain per level — the other branch pays you too.`;
    default: return "";
  }
}

const CUR_NAMES = {
  algorithms: "Insight", systems: "Uptime", craft: "Trust", business: "Capital",
  data: "Signal", security: "Findings", community: "Karma", research: "Proof",
};

const GEN_LABELS = {
  [MACHINES.join(",")]: "every machine",
  [PEOPLE.join(",")]: "everyone helping you",
  [PIPELINE.join(",")]: "your build pipeline",
};

function buildSkills() {
  const out = [];

  /* --- global gateways: one purchase each, never upgradable --- */
  out.push({
    id: "g0", branch: "global", name: "First Principles", tier: 0, gateway: true,
    desc: "Understand it before you type it. Opens every branch of the tree.",
    req: [], currency: "kp", cost: 5, costGrowth: 1, maxLevel: 1,
    kind: "output", power: 0.25,
  });

  const branchGateId = (b) => `b_${b}`;

  for (const b of BRANCH_ORDER) {
    const c = BRANCH_CONTENT[b];
    out.push({
      id: branchGateId(b), branch: b, name: c.gate[0], tier: 0, gateway: true,
      desc: `${c.gate[1]} Opens the ${CUR_NAMES[b]} faucet.`,
      req: ["g0"], currency: "kp", cost: GATE_COST[b], costGrowth: 1, maxLevel: 1,
      kind: "output", power: 0.1,
    });
  }

  out.push({
    id: "g1", branch: "global", name: "Two Ways To Learn", tier: 0, gateway: true,
    desc: "Reasoning and machinery, held at the same time. ×1.5 to all output.",
    req: ["b_algorithms", "b_systems"], currency: "kp", cost: 260, costGrowth: 1, maxLevel: 1,
    kind: "output", power: 0.5,
  });
  out.push({
    id: "g2", branch: "global", name: "The Wide Net", tier: 0, gateway: true,
    desc: "Quality, commerce and data, all open at once. ×2 to all output.",
    req: ["b_craft", "b_business", "b_data"], currency: "kp", cost: 4200, costGrowth: 1, maxLevel: 1,
    kind: "output", power: 1,
  });
  out.push({
    id: "g3", branch: "global", name: "Nothing Left To Open", tier: 0, gateway: true,
    desc: "Every faucet running. ×3 to all output and every branch currency.",
    req: ["b_security", "b_community", "b_research"], currency: "kp", cost: 65000, costGrowth: 1, maxLevel: 1,
    kind: "output", power: 2,
  });

  /* --- per branch: 3 sub-gateways + 33 upgradable skills --- */
  for (const b of BRANCH_ORDER) {
    const c = BRANCH_CONTENT[b];
    const subIds = [`${b}_s1`, `${b}_s2`, `${b}_s3`];
    const subCost = [140, 3200, 90000];

    c.subs.forEach((s, i) => {
      out.push({
        id: subIds[i], branch: b, name: s[0], tier: 0, gateway: true,
        desc: `${s[1]} Unlocks tier ${i + 2} of ${b}.`,
        req: [i === 0 ? branchGateId(b) : subIds[i - 1]],
        currency: b, cost: subCost[i], costGrowth: 1, maxLevel: 1,
        kind: "currency", power: 0.15,
      });
    });

    const tiers = [c.t1, c.t2, c.t3, c.t4, c.t5];
    const t4ids = [];

    tiers.forEach((names, ti) => {
      const tier = ti + 1;
      const [baseCost, growth, maxLevel] = TIER_SHAPE[tier];
      names.forEach((name, ni) => {
        let kind = c.kinds[ni % c.kinds.length];
        if (tier === 5) kind = ni === 0 ? "output" : ni === 1 ? "currency" : "crossCurrency";
        let power = POWER[kind][ti];
        if (kind === "bugSlow" && c.invertBugs) power = -power * 1.4;

        const gens = kind === "genGroup" ? c.gens ?? MACHINES : undefined;
        const target = kind === "currency" ? b : kind === "crossCurrency" ? c.cross : undefined;
        const ctx = {
          curName: CUR_NAMES[b],
          crossName: CUR_NAMES[c.cross],
          gensLabel: gens ? GEN_LABELS[gens.join(",")] ?? "your tools" : "",
        };

        const id = `${b}_${tier}_${slug(name)}`;
        if (tier === 4) t4ids.push(id);

        // costs fan out a little across a tier so the order you buy in matters
        const cost = Math.round(baseCost * (1 + ni * 0.34) * (kind === "currency" ? 1.6 : 1));

        let req;
        if (tier === 1) req = [branchGateId(b)];
        else if (tier === 5) req = [t4ids[(ni * 2) % t4ids.length], t4ids[(ni * 2 + 1) % t4ids.length]];
        else req = [subIds[tier - 2]];

        out.push({
          id, branch: b, name, tier, req,
          desc: describe(kind, power, ctx),
          currency: b, cost, costGrowth: growth, maxLevel,
          kind, power,
          ...(gens ? { gens } : {}),
          ...(target ? { target } : {}),
        });
      });
    });
  }

  return out;
}

/* ------------------------------------------------------------------ *
 *  Shop upgrades
 * ------------------------------------------------------------------ */

const GENERATORS = [
  ["notepad", "📝", "Notepad Window"], ["duck", "🦆", "Rubber Duck"],
  ["so", "📋", "Stack Overflow Tab"], ["ide", "🧩", "A Real IDE"],
  ["snips", "📦", "Snippet Library"], ["tests", "✅", "Test Suite"],
  ["ci", "🔁", "CI/CD Pipeline"], ["junior", "👤", "Junior Developer"],
  ["oss", "🌐", "OSS Contributors"], ["pair", "🤖", "AI Pair Programmer"],
  ["farm", "🏭", "Distributed Build Farm"], ["swarm", "🌌", "Autonomous Agent Swarm"],
];
const GEN_BASE = {
  notepad: 10, duck: 120, so: 1500, ide: 2.2e4, snips: 2.8e5, tests: 3.6e6,
  ci: 5e7, junior: 7e8, oss: 1.2e10, pair: 1.9e11, farm: 2.9e12, swarm: 4.4e13,
};

const GEN_TIERS = [
  ["tuned", 10, 20, 2], ["sharpened", 25, 140, 2], ["mastered", 50, 900, 3],
  ["industrialised", 100, 7e3, 3], ["automated", 175, 6e4, 4],
  ["orchestrated", 250, 5e5, 4], ["perfected", 350, 4.5e6, 5], ["transcendent", 500, 4e7, 6],
];

const OUTPUT_POOL = [
  ["☕", "Coffee Subscription"], ["🎧", "Noise-Cancelling Headphones"], ["🪑", "A Chair That Fits"],
  ["🖥️", "Second Monitor"], ["💡", "Decent Desk Lamp"], ["🌱", "A Plant, Somehow"],
  ["🚪", "A Door That Closes"], ["📵", "Notifications Off"], ["🗓️", "No-Meeting Wednesdays"],
  ["🧘", "Twenty Minutes Of Nothing"], ["🚶", "The Walk That Solves It"], ["🛏️", "Actual Sleep"],
  ["🍱", "Lunch Away From The Desk"], ["📓", "A Paper Notebook"], ["⌛", "Pomodoro, Reluctantly"],
  ["🧊", "A Cold Room"], ["🎼", "The Same Album On Repeat"], ["🚿", "Shower Thoughts"],
  ["🗺️", "A Written Plan"], ["🧵", "One Thread At A Time"], ["📴", "Airplane Mode Mornings"],
  ["🏃", "Running Before Work"], ["🪟", "A Window"], ["🔇", "Silent Standups"],
  ["🧱", "Blocked Calendar"], ["🧑‍🤝‍🧑", "A Team That Trusts You"], ["📐", "A Style Guide Everyone Follows"],
  ["🛠️", "Tools You Chose Yourself"], ["🧯", "Nothing On Fire"], ["🎯", "One Priority"],
  ["🌀", "Protected Focus Time"], ["🛰️", "Working Async"], ["🏝️", "A Real Holiday"],
  ["🧩", "The Right Abstraction"], ["⏳", "Ten Thousand Hours"], ["🧠", "It Just Comes To You Now"],
];
const INCOME_POOL = [
  ["🧾", "Sending Invoices On Time"], ["📈", "A Raise You Asked For"], ["🎙️", "Conference Talk"],
  ["🌙", "Consulting On The Side"], ["💖", "Sponsorware"], ["📚", "A Book Deal"],
  ["🏷️", "Raising Your Rate"], ["🤝", "A Second Client"], ["🧰", "Selling Your Tooling"],
  ["🎓", "A Paid Course"], ["📰", "Paid Newsletter"], ["🧑‍⚖️", "A Contract Lawyer"],
  ["🏢", "Enterprise Logo"], ["🔁", "Annual Contracts"], ["📊", "Usage-Based Pricing"],
  ["🪙", "Equity Instead Of Cash"], ["🪑", "Board Seat"], ["🏦", "A Real Finance Function"],
  ["🌍", "International Clients"], ["🧮", "Margin Discipline"], ["🎟️", "Licensing Deal"],
  ["🛒", "A Marketplace Listing"], ["🧲", "Inbound Only"], ["🗝️", "Exclusivity Clause"],
  ["📦", "Productised Service"], ["🏛️", "Government Framework"], ["💼", "Acquisition Interest"],
  ["🧊", "A Very Large Cheque"],
];
const CLICK_POOL = [
  ["⌨️", "Mechanical Keyboard"], ["➡️", "Vim Motions"], ["👐", "Touch Typing"],
  ["🦾", "Split Ergonomic Keyboard"], ["🖱️", "A Mouse You Never Use"], ["⚡", "Custom Keybindings"],
  ["📋", "Clipboard Manager"], ["🔤", "Text Expander"], ["🪄", "Multi-Cursor Everything"],
  ["🧭", "Fuzzy File Jump"], ["🔁", "Macro Recording"], ["🎹", "Home Row Mods"],
  ["🧊", "Lubed Switches"], ["📏", "Tenting The Board"], ["🖐️", "Wrist Rest"],
  ["🕹️", "Foot Pedals, Genuinely"], ["🧠", "Muscle Memory"], ["🌀", "Typing Without Looking"],
  ["♾️", "The Keyboard Disappears"], ["✍️", "Thought To Text"],
];
const BUG_POOL = [
  ["🧹", "Linter Config"], ["🚦", "Merge Gate"], ["🎲", "Fuzz Testing"], ["📡", "Observability Stack"],
  ["🔍", "Error Tracking"], ["🧪", "A Staging Environment"], ["🧯", "Feature Flags"],
  ["📋", "Runbooks"], ["🔔", "Alerts That Mean Something"], ["🧊", "Freeze Before Release"],
  ["🔬", "Root Cause Analysis"], ["📝", "Blameless Postmortems"], ["🛡️", "Type Checking"],
  ["🧷", "Assertions In Production"], ["🪞", "Shadow Traffic"], ["🐤", "Canary Deploys"],
  ["↩️", "One-Click Rollback"], ["🧮", "Invariant Checks"], ["🧊", "Deterministic Builds"],
  ["🕸️", "Dependency Pinning"], ["🚧", "Pre-Commit Hooks"], ["📉", "Error Budgets"],
  ["🧿", "Chaos Testing"], ["🏗️", "Rewrite The Bad Module"],
];
const KNOW_POOL = [
  ["✍️", "Technical Blog"], ["📘", "Write The Book"], ["📖", "Reading Group"],
  ["🎓", "A Real Course"], ["🗣️", "Explaining It To Someone"], ["🗂️", "A Second Brain"],
  ["🔖", "Annotated Papers"], ["🧑‍🏫", "Teaching A Class"], ["🧪", "A Side Experiment"],
  ["🧭", "A Mentor"], ["📺", "Watching The Talks"], ["🧵", "Long-Form Threads"],
  ["🗃️", "Your Own Wiki"], ["🔁", "Spaced Repetition"], ["🧑‍🔬", "A Research Sabbatical"],
  ["🌌", "Understanding The Whole Stack"],
];

const BRANCH_UPGRADES = {
  algorithms: [["♟️", "Competitive Practice"], ["📐", "Whiteboard Discipline"], ["🧩", "Puzzle Habit"],
    ["🧮", "Complexity Budget"], ["🔬", "Micro-Benchmarks"], ["🧠", "Pattern Library"],
    ["🎯", "Reduce, Then Solve"], ["♾️", "Asymptotically Free"]],
  systems: [["🐧", "A Linux Box Under The Desk"], ["📊", "Flame Graphs"], ["🔧", "Kernel Tuning"],
    ["🧊", "Cold Storage Tier"], ["🛰️", "Multi-Region"], ["⚙️", "Custom Scheduler"],
    ["🧯", "Graceful Degradation"], ["♾️", "Always On"]],
  craft: [["📏", "House Style"], ["👀", "Mandatory Review"], ["🧪", "Test First, Always"],
    ["🗜️", "Delete More Than You Add"], ["🧭", "Architecture Decision Records"], ["🧼", "Boy Scout Rule"],
    ["🛡️", "Defensive Boundaries"], ["♾️", "Provably Correct"]],
  business: [["💼", "A Real Contract Template"], ["📞", "Discovery Calls"], ["🏷️", "Published Pricing"],
    ["🤲", "Deposit Up Front"], ["📊", "Unit Economics"], ["🧾", "Automated Billing"],
    ["🏛️", "Legal Entity"], ["♾️", "Money While You Sleep"]],
  data: [["🗄️", "A Real Warehouse"], ["🧊", "Columnar Everything"], ["🔎", "Query Profiler"],
    ["🧬", "Schema Registry"], ["📈", "Live Dashboards"], ["🪣", "Object Storage"],
    ["🧮", "Precomputed Rollups"], ["♾️", "Instant Answers"]],
  security: [["🔓", "A Lab Environment"], ["📮", "Private Bounty Programme"], ["🧬", "Symbolic Execution"],
    ["🕶️", "Anonymous Disclosure"], ["⛓️", "Chained Primitives"], ["🧨", "Weaponised Proof-Of-Concept"],
    ["🗝️", "Broker Relationship"], ["♾️", "Nothing Is Closed To You"]],
  community: [["📣", "A Following"], ["🎪", "Running A Conference"], ["🧑‍🏫", "A Mentoring Programme"],
    ["💝", "Sponsors"], ["🌍", "Translated Docs"], ["🏅", "Contributor Awards"],
    ["🏛️", "A Foundation"], ["♾️", "It Outlives You"]],
  research: [["📄", "First Publication"], ["🔁", "Reproduction Package"], ["🧑‍🔬", "A Lab"],
    ["💰", "Funded Grant"], ["🏆", "Best Paper"], ["📚", "Cited Everywhere"],
    ["🧭", "Setting The Agenda"], ["♾️", "A New Field"]],
};

const TRACK_UPGRADES = {
  product: [["📊", "Analytics Dashboard"], ["🚩", "Feature Flags"], ["🤝", "Enterprise Contract"],
    ["🗺️", "Own The Roadmap"], ["🧲", "Product-Led Growth"], ["🏆", "Category Definition"]],
  game: [["🧱", "Level Editor"], ["💡", "Ray Tracing"], ["🕹️", "Store Front Page"],
    ["⚙️", "Your Own Engine"], ["🎬", "A Real Trailer"], ["🏆", "Game Of The Year"]],
  security: [["🔬", "Disassembler"], ["📮", "Private Bug Bounty"], ["⛓️", "Exploit Chain"],
    ["🕶️", "Zero-Day Broker"], ["🧿", "Threat Intel Feed"], ["🏆", "Pwn Of The Year"]],
  kernel: [["🥾", "Custom Bootloader"], ["🔗", "Lock-Free Queues"], ["📥", "Upstream Merge"],
    ["💿", "Your Own OS"], ["🧊", "Real-Time Patches"], ["🏆", "Maintainer Of Record"]],
  ai: [["🎛️", "GPU Cluster Time"], ["🗂️", "Clean Dataset"], ["📄", "Published Paper"],
    ["🛰️", "Frontier Run"], ["🧪", "Eval Harness"], ["🏆", "State Of The Art"]],
  compiler: [["🔍", "Peephole Passes"], ["📎", "Inline Everything"], ["⚡", "JIT Tier-Up"],
    ["📚", "Standard Library"], ["🧬", "Auto-Vectorisation"], ["🏆", "The Reference Implementation"]],
  embedded: [["📟", "Logic Analyser"], ["🔧", "Board Bring-Up"], ["🏗️", "Fab Partnership"],
    ["📦", "Ships By The Million"], ["🔋", "Energy Harvesting"], ["🏆", "Design Win"]],
};

const ROMAN = ["", " II", " III", " IV", " V", " VI"];

function ladder(pool, tiers, family, mk) {
  const out = [];
  for (let t = 0; t < tiers; t++) {
    pool.forEach(([emoji, name], i) => {
      const step = t * pool.length + i;
      out.push({ emoji, name: name + ROMAN[t], family, ...mk(step, t, i) });
    });
  }
  return out;
}

function buildUpgrades() {
  const out = [];
  let n = 0;
  const push = (u) => { out.push({ id: `u${(n++).toString(36)}_${slug(u.name)}`, ...u }); };

  /* generator tiers: 12 × 8 = 96 */
  for (const [gid, emoji, gname] of GENERATORS) {
    GEN_TIERS.forEach(([word, owned, costMul, mult]) => {
      push({
        emoji, name: `${gname} · ${word}`, family: "generator",
        desc: `${gname} produces ×${mult}.`,
        cost: Math.round(GEN_BASE[gid] * costMul),
        fx: { gens: [gid], genMult: mult },
        reqGen: [gid, owned],
      });
    });
  }

  /* global output: 36 × 2 = 72 */
  ladder(OUTPUT_POOL, 2, "output", (step, t) => ({
    desc: `+${10 + step}% to all code output.`,
    cost: Math.round(4e4 * Math.pow(2.35, step)),
    fx: { all: 1 + (10 + step) / 100 },
    reqRank: Math.min(15, 1 + Math.floor(step / 4) + t * 2),
  })).forEach(push);

  /* income: 28 × 2 = 56 */
  ladder(INCOME_POOL, 2, "income", (step, t) => ({
    desc: `×${(1.2 + step * 0.09).toFixed(2)} income.`,
    cost: Math.round(9e4 * Math.pow(2.6, step)),
    fx: { money: 1.2 + step * 0.09 },
    reqRank: Math.min(15, 2 + Math.floor(step / 4) + t * 2),
  })).forEach(push);

  /* click: 20 × 2 = 40 */
  ladder(CLICK_POOL, 2, "click", (step) => ({
    desc: `×${(1.5 + step * 0.16).toFixed(2)} click power.`,
    cost: Math.round(150 * Math.pow(3.6, step)),
    fx: { click: 1.5 + step * 0.16 },
    reqClicks: 40 + step * 260,
  })).forEach(push);

  /* bugs & quality: 24 × 2 = 48 */
  ladder(BUG_POOL, 2, "quality", (step, t) => ({
    desc: t === 0 ? `Bugs appear ${8 + step}% slower.` : `Bugs throttle you ${8 + step}% less.`,
    cost: Math.round(1.5e5 * Math.pow(2.7, step)),
    fx: t === 0 ? { bugRate: 1 - (8 + step) / 100 } : { sev: 1 - (8 + step) / 100 },
    reqBugsKilled: 20 + step * 220,
  })).forEach(push);

  /* knowledge: 16 × 2 = 32 */
  ladder(KNOW_POOL, 2, "knowledge", (step, t) => ({
    desc: `×${(1.3 + step * 0.12).toFixed(2)} knowledge gain.`,
    cost: Math.round(1.2e6 * Math.pow(2.9, step)),
    fx: { kp: 1.3 + step * 0.12 },
    reqRank: Math.min(15, 3 + Math.floor(step / 3) + t),
  })).forEach(push);

  /* branch-flavoured: 8 × 8 = 64 */
  for (const b of BRANCH_ORDER) {
    BRANCH_UPGRADES[b].forEach(([emoji, name], i) => {
      push({
        emoji, name, family: `branch:${b}`,
        desc: `+${(15 + i * 10)}% ${CUR_NAMES[b]} gain and +${8 + i * 4}% output.`,
        cost: Math.round(2e5 * Math.pow(6.5, i)),
        fx: { cur: { [b]: 1 + (15 + i * 10) / 100 }, all: 1 + (8 + i * 4) / 100 },
        reqBranch: b,
      });
    });
  }

  /* track-exclusive: 7 × 6 = 42 */
  const TRACK_FX = [
    { all: 1.4 }, { money: 2 }, { all: 1.8, money: 1.5 },
    { all: 2.4 }, { all: 2, kp: 2 }, { all: 3, money: 3 },
  ];
  for (const [tid, list] of Object.entries(TRACK_UPGRADES)) {
    list.forEach(([emoji, name], i) => {
      const fx = TRACK_FX[i];
      const parts = [];
      if (fx.all) parts.push(`×${fx.all} output`);
      if (fx.money) parts.push(`×${fx.money} income`);
      if (fx.kp) parts.push(`×${fx.kp} knowledge`);
      push({
        emoji, name, family: `track:${tid}`,
        desc: parts.join(", ") + ".",
        cost: Math.round(3e5 * Math.pow(30, i)),
        fx,
        reqTrack: tid,
        reqRank: 4 + i * 2,
      });
    });
  }

  return out;
}

/* ------------------------------------------------------------------ *
 *  Emit
 * ------------------------------------------------------------------ */

const HEADER = `/* GENERATED FILE — do not edit by hand.
 * Produced by scripts/gen-content.mjs. Run \`npm run gen\` after changing that script.
 */\n`;

function emit(file, decl, rows) {
  const body = rows.map((r) => "  " + JSON.stringify(r) + ",").join("\n");
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, file), `${HEADER}${decl} = [\n${body}\n];\n`, "utf8");
}

const skills = buildSkills();
const upgrades = buildUpgrades();

emit(
  "skills.generated.ts",
  'import type { Skill } from "../core/types";\n\nexport const SKILLS: Skill[]',
  skills,
);
emit(
  "upgrades.generated.ts",
  'import type { Upgrade } from "../core/types";\n\nexport const UPGRADES: Upgrade[]',
  upgrades,
);

const gateways = skills.filter((s) => s.gateway).length;
const levels = skills.reduce((a, s) => a + s.maxLevel, 0);
console.log(`skills:   ${skills.length}  (${gateways} gateways, ${skills.length - gateways} upgradable, ${levels} total levels)`);
console.log(`upgrades: ${upgrades.length}`);

/* integrity: every prerequisite must exist, every id unique */
const ids = new Set();
for (const s of skills) {
  if (ids.has(s.id)) throw new Error(`duplicate skill id: ${s.id}`);
  ids.add(s.id);
}
for (const s of skills) {
  for (const r of s.req) if (!ids.has(r)) throw new Error(`${s.id} requires missing ${r}`);
}
const uids = new Set();
for (const u of upgrades) {
  if (uids.has(u.id)) throw new Error(`duplicate upgrade id: ${u.id}`);
  uids.add(u.id);
}
console.log("integrity: ok");
