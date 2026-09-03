/**
 * Content generator.
 *
 * Authored name/effect pools in, two committed TypeScript data files out:
 *   src/data/skills.generated.ts    — 600 skills across 8 branches
 *   src/data/upgrades.generated.ts  — ~900 shop upgrades
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

const MACHINES = ["notepad", "ide", "ci", "pair", "farm", "swarm", "synth", "foundry", "orbital", "singular"];
const PEOPLE = ["duck", "so", "junior", "oss", "campus"];
const PIPELINE = ["snips", "tests", "ci", "farm", "spec", "fleet", "civ"];

/** tier -> [cost of level 1, cost growth, max level] */
const TIER_SHAPE = {
  1: [8, 1.42, 12],
  2: [95, 1.5, 10],
  3: [1500, 1.58, 8],
  4: [24000, 1.68, 6],
  5: [420000, 1.85, 5],
  6: [8.4e6, 2, 4],
  7: [1.9e8, 2.2, 3],
};

/**
 * Per-position multiplier, so two skills of one kind never read identically.
 * Six entries against an eight-kind rotation: inside a twelve-name tier every
 * (kind, jitter) pair is distinct, which is what the integrity check demands.
 */
const JITTER = [0.8, 0.92, 1, 1.12, 1.24, 1.38];

const round6 = (x) => Math.round(x * 1e6) / 1e6;

/** how strong one level of each kind is, by tier */
const POWER = {
  output: [0.06, 0.09, 0.13, 0.19, 0.32, 0.5, 0.8],
  clickPower: [0.14, 0.2, 0.28, 0.4, 0.65, 1, 1.6],
  clickPct: [0.0015, 0.003, 0.006, 0.012, 0.025, 0.045, 0.08],
  income: [0.08, 0.12, 0.17, 0.25, 0.4, 0.62, 1],
  knowledge: [0.07, 0.11, 0.16, 0.23, 0.38, 0.6, 0.95],
  genGroup: [0.1, 0.15, 0.22, 0.32, 0.5, 0.8, 1.25],
  bugSlow: [0.04, 0.06, 0.085, 0.12, 0.2, 0.3, 0.42],
  bugSoften: [0.035, 0.055, 0.08, 0.11, 0.18, 0.27, 0.38],
  debugPower: [0.12, 0.18, 0.26, 0.36, 0.6, 0.95, 1.5],
  autoClean: [0.0012, 0.0022, 0.0038, 0.006, 0.011, 0.018, 0.03],
  cheaper: [0.012, 0.02, 0.03, 0.045, 0.075, 0.11, 0.16],
  offline: [0.03, 0.05, 0.08, 0.12, 0.2, 0.3, 0.45],
  luck: [0.05, 0.08, 0.12, 0.18, 0.3, 0.47, 0.75],
  currency: [0.09, 0.14, 0.2, 0.3, 0.5, 0.8, 1.25],
  crossCurrency: [0.07, 0.11, 0.16, 0.24, 0.4, 0.62, 1],
};

/**
 * Each branch supplies 67 skill names split 12 / 12 / 12 / 10 / 8 / 8 / 5 across
 * tiers 1..7, six sub-path gateway names, and the rotation of effect kinds that
 * gives the branch its character.
 */
const BRANCH_CONTENT = {
  algorithms: {
    gate: ["Algorithmic Thinking", "Stop guessing. Start reasoning about what the machine will actually do."],
    subs: [
      ["Open: Combinatorics", "Counting, ordering, and the structures underneath both."],
      ["Open: Advanced Structures", "The data structures that make hard problems easy."],
      ["Open: Theory", "Where the field runs out of known answers."],
      ["Open: Optimisation", "Not just an answer. The best one, provably."],
      ["Open: Barriers", "The reasons the easy proof cannot work."],
      ["Open: The Frontier", "Questions with no textbook behind them."],
    ],
    kinds: ["clickPower", "output", "clickPct", "currency", "knowledge", "debugPower", "crossCurrency", "cheaper"],
    cross: "research",
    t1: ["Loops", "Recursion", "Binary Search", "Hash Maps", "Sorting Networks", "Two Pointers",
      "Sliding Window", "Amortised Analysis", "Prefix Sums", "Stacks & Queues", "Linked Structures", "Big-O By Eye"],
    t2: ["Dynamic Programming", "Greedy Proofs", "Graph Traversal", "Union-Find", "Heaps & Priority Queues",
      "Bit Manipulation", "Memoisation", "Divide & Conquer", "Topological Order", "Shortest Paths",
      "Backtracking", "Interval Trees"],
    t3: ["Suffix Automata", "Max-Flow Min-Cut", "Segment Trees", "Convex Hull Trick", "Number Theory",
      "Randomised Algorithms", "Approximation Bounds", "Cache-Oblivious Design", "Fast Fourier Transform",
      "Persistent Structures", "Heavy-Light Decomposition", "Suffix Arrays"],
    t4: ["Linear Programming", "Spectral Methods", "Streaming Algorithms", "Parameterised Complexity",
      "Quantum-Inspired Search", "Proof by Induction", "Sublinear Algorithms", "Metric Embeddings",
      "Online Competitive Analysis", "Matroid Intersection"],
    t5: ["Lower Bound Arguments", "Derandomisation", "Hardness Of Approximation", "Circuit Complexity",
      "Communication Complexity", "Sublinear Sketching", "Fine-Grained Complexity", "Algebraic Complexity"],
    t6: ["Interactive Proofs", "The PCP Theorem", "Expander Graphs", "Zero-Knowledge Constructions",
      "Quantum Query Bounds", "Descriptive Complexity", "Relativisation Barriers", "Universal Search"],
    t7: ["P versus NP Intuition", "Optimal Substructure", "Closed Form For Everything",
      "A Proof That Fits The Margin", "The Algorithm That Ends The Search"],
  },
  systems: {
    gate: ["Systems Literacy", "The machine is not a mystery. It is a stack of things you can read."],
    subs: [
      ["Open: Concurrency", "Two things at once, correctly."],
      ["Open: Distribution", "Many machines pretending to be one."],
      ["Open: Bare Metal", "Below the runtime, below the kernel."],
      ["Open: Silicon", "The parts that stopped being software."],
      ["Open: Planet Scale", "Latency you measure against the speed of light."],
      ["Open: The Substrate", "Machines you no longer have to think about."],
    ],
    kinds: ["genGroup", "output", "offline", "currency", "cheaper", "autoClean", "crossCurrency", "bugSoften"],
    cross: "data",
    gens: MACHINES,
    t1: ["Bash Scripting", "Cron Jobs", "Process Supervision", "File Descriptors", "Pipes & Redirection",
      "Service Units", "Log Rotation", "Shell Functions", "Signal Handling", "Environment Hygiene",
      "Filesystem Layout", "Package Management"],
    t2: ["Concurrency", "Thread Pools", "Memory Mapping", "Zero-Copy I/O", "Event Loops", "Backpressure",
      "Connection Pooling", "Batch Windows", "Async Runtimes", "Work Stealing", "Timer Wheels", "Ring Buffers"],
    t3: ["Distributed Locks", "Consensus Protocols", "Sharding", "Replication Lag", "Idempotent Retries",
      "Circuit Breakers", "Load Shedding", "Cell Architecture", "Gossip Membership", "Vector Clocks",
      "Quorum Reads", "Leader Election"],
    t4: ["NUMA Awareness", "Kernel Bypass", "Custom Allocators", "Lock-Free Queues", "Hardware Counters",
      "Bare-Metal Scheduling", "Huge Pages", "Interrupt Affinity", "Cache Line Discipline", "Direct I/O"],
    t5: ["Silicon Budgets", "Firmware Ownership", "Custom Interconnect", "Rack-Level Design", "Power Envelopes",
      "Thermal Headroom", "Failure Domains", "Deterministic Latency"],
    t6: ["Continental Replication", "Anycast Routing", "Clock Discipline", "Zero-Downtime Migration",
      "Self-Healing Topology", "Capacity Autopilot", "Formal Consensus Proofs", "Hardware-Software Codesign"],
    t7: ["Planet-Scale Routing", "Nine Nines", "The Machine That Never Stops",
      "Uptime As A Physical Constant", "Infrastructure Nobody Thinks About"],
  },
  craft: {
    gate: ["Craftsmanship", "Quality is not a phase at the end. It is how fast you go."],
    subs: [
      ["Open: Testing", "Confidence you can run on demand."],
      ["Open: Review Culture", "Two pairs of eyes, one standard."],
      ["Open: Verification", "Proof instead of hope."],
      ["Open: Architecture", "Decisions that outlive the sprint."],
      ["Open: Reliability", "It keeps working while you sleep."],
      ["Open: Perfection", "The last defect, and then no more."],
    ],
    kinds: ["bugSlow", "debugPower", "bugSoften", "currency", "autoClean", "output", "crossCurrency", "knowledge"],
    cross: "community",
    t1: ["Naming Things", "Small Functions", "Guard Clauses", "Consistent Formatting", "Meaningful Commits",
      "Pull Request Hygiene", "Readable Diffs", "Dead Code Removal", "Early Returns", "One Reason To Change",
      "Comment Restraint", "Deleting Branches"],
    t2: ["Unit Testing", "Property Testing", "Golden Files", "Test Fixtures", "Mutation Testing", "Coverage Gates",
      "Flake Hunting", "Fast Feedback", "Test Doubles", "Arrange Act Assert", "Seeded Randomness",
      "Snapshot Discipline"],
    t3: ["Code Review", "Pair Review", "Design Documents", "Refactoring Catalogue", "Dependency Hygiene",
      "Contract Tests", "Static Analysis", "Type Coverage", "Review Checklists", "Small Pull Requests",
      "Shared Ownership", "Style Automation"],
    t4: ["Formal Specification", "Model Checking", "Fuzzing At Scale", "Chaos Drills", "Deterministic Builds",
      "Provable Invariants", "Refinement Types", "Bisimulation", "Symbolic Testing", "Reproducible Toolchains"],
    t5: ["Hexagonal Boundaries", "Seams For Change", "Strangler Migrations", "Error Budgets",
      "Graceful Failure Modes", "Backward Compatibility", "Schema Evolution", "Deprecation With Grace"],
    t6: ["Machine-Checked Proofs", "Total Functions", "Exhaustive Case Analysis", "Verified Compilation",
      "Runtime Contracts", "Continuous Verification", "Correct By Construction", "Zero-Regression Culture"],
    t7: ["Zero Known Defects", "The Codebase Reads Itself", "Nothing Ever Breaks",
      "A Test For Every Sentence", "Quality Costs Nothing Now"],
  },
  business: {
    gate: ["Commercial Sense", "Someone is paying for this. Understand who, and why."],
    subs: [
      ["Open: Selling", "Talking about the work without flinching."],
      ["Open: Products", "Stop trading hours. Start shipping units."],
      ["Open: Ownership", "The part of the company that is yours."],
      ["Open: Volume", "The same offer, a hundred times over."],
      ["Open: Capital", "Money that goes to work without you."],
      ["Open: The Long Game", "Wealth measured in decades, not deals."],
    ],
    kinds: ["income", "cheaper", "output", "currency", "luck", "knowledge", "crossCurrency", "offline"],
    cross: "algorithms",
    t1: ["Time Tracking", "Invoicing", "Scope Control", "Honest Estimates", "Client Communication",
      "Contract Reading", "Rate Card", "Retainer Terms", "Expense Discipline", "Saying No",
      "Written Agreements", "Milestone Billing"],
    t2: ["Negotiation", "Positioning", "Case Studies", "Referral Network", "Value Pricing", "Upselling",
      "Renewal Motion", "Payment Terms", "Discovery Questions", "Proposal Craft", "Anchoring",
      "Reference Customers"],
    t3: ["Productising", "Licensing", "Channel Partners", "Enterprise Sales", "Support Contracts",
      "Usage Billing", "Land And Expand", "Margin Discipline", "Self-Serve Funnel",
      "Procurement Navigation", "Pilot To Contract", "Pricing Experiments"],
    t4: ["Equity Negotiation", "Board Reporting", "Fundraising", "Acquisition Terms", "Option Refresh",
      "Secondary Sale", "Cap Table Hygiene", "Term Sheet Fluency", "Debt Instead Of Dilution",
      "Investor Updates"],
    t5: ["Category Creation", "Platform Economics", "Network Effects", "Pricing Power",
      "Distribution Advantage", "Switching Costs", "Bundling Strategy", "Operating Leverage"],
    t6: ["A Holding Company", "Portfolio Allocation", "Buy And Build", "Recurring Everything",
      "Compounding Reinvestment", "Balance Sheet Strength", "Countercyclical Bets", "Perpetual Capital"],
    t7: ["Ownership", "The Cap Table", "Never Trading Hours Again",
      "Money Without Attention", "The Business Runs Itself"],
  },
  data: {
    gate: ["Data Literacy", "The system already knows. You just have to ask it properly."],
    subs: [
      ["Open: Pipelines", "Moving it reliably, on a schedule."],
      ["Open: Streaming", "Answering before the question is finished."],
      ["Open: Scale", "When the table does not fit anywhere."],
      ["Open: Inference", "Turning rows into claims you can defend."],
      ["Open: Learning", "Letting the data write the rules."],
      ["Open: Omniscience", "Nothing happens that you cannot see."],
    ],
    kinds: ["output", "knowledge", "genGroup", "currency", "clickPct", "cheaper", "crossCurrency", "luck"],
    cross: "systems",
    gens: PIPELINE,
    t1: ["CSV Wrangling", "SQL Basics", "Indexing", "Query Plans", "Joins That Work", "Aggregation",
      "Window Functions", "Type Discipline", "Null Handling", "Deduplication", "Date Arithmetic", "Sampling"],
    t2: ["ETL Pipelines", "Schema Design", "Partitioning", "Columnar Storage", "Incremental Loads",
      "Data Contracts", "Backfills", "Late-Arriving Data", "Idempotent Jobs", "Orchestration DAGs",
      "Change Data Capture", "Slowly Changing Dimensions"],
    t3: ["Stream Processing", "Exactly-Once Delivery", "Feature Stores", "Lakehouse Layout",
      "Query Federation", "Cost Attribution", "Lineage Tracking", "Semantic Layer", "Watermarks",
      "Session Windows", "Materialised Views", "Approximate Counting"],
    t4: ["Vector Indexes", "Petabyte Scans", "Adaptive Compression", "Learned Indexes", "Real-Time OLAP",
      "Zero-ETL", "Tiered Storage", "Result Caching", "Predicate Pushdown", "Distributed Shuffle"],
    t5: ["Causal Inference", "Experiment Design", "Metric Trees", "Anomaly Detection",
      "Forecasting Discipline", "Segmentation That Holds", "Survivorship Awareness", "Statistical Power"],
    t6: ["Feature Engineering At Scale", "Model Monitoring", "Retraining Pipelines", "Embedding Stores",
      "Counterfactual Evaluation", "Data-Centric Iteration", "Automated Labelling", "Drift Containment"],
    t7: ["Every Question Answerable", "The Warehouse Is The Product", "Signal Without Noise",
      "The Dashboard Nobody Doubts", "Prediction Before The Event"],
  },
  security: {
    gate: ["Adversarial Mindset", "Read every line as if someone is trying to make it lie."],
    subs: [
      ["Open: Offensive Basics", "The first rung of actually breaking things."],
      ["Open: Exploitation", "From a crash to a shell."],
      ["Open: Research", "Finding what nobody has found yet."],
      ["Open: Hardware", "Attacks the software cannot see."],
      ["Open: Defence", "Everything you learned, pointed the other way."],
      ["Open: Disclosure", "What you found, handled properly."],
    ],
    kinds: ["bugSlow", "output", "income", "currency", "debugPower", "knowledge", "crossCurrency", "luck"],
    cross: "craft",
    /* security wants MORE defects: negative bugSlow power raises the rate on purpose */
    invertBugs: true,
    t1: ["Threat Modelling", "Input Validation", "Secrets Handling", "Least Privilege", "Dependency Audits",
      "Log Redaction", "Auth Fundamentals", "Session Hygiene", "Transport Security", "Password Storage",
      "Access Reviews", "Security Headers"],
    t2: ["Static Scanning", "Fuzz Harnesses", "Reverse Engineering", "Memory Safety Bugs", "Race Conditions",
      "Deserialisation Bugs", "Request Forgery", "Path Traversal", "Injection Classes", "Logic Flaws",
      "Cryptographic Misuse", "Business Rule Abuse"],
    t3: ["Privilege Escalation", "Kernel Exploits", "Sandbox Escapes", "Side Channels", "Supply Chain Attacks",
      "Cryptanalysis", "Firmware Extraction", "Hypervisor Bugs", "Type Confusion", "Use-After-Free Analysis",
      "Integer Boundary Bugs", "Parser Differentials"],
    t4: ["Zero-Day Research", "Exploit Chaining", "Mitigation Bypass", "Persistent Implants",
      "Hardware Fault Injection", "Nation-State Tooling", "Bug Class Discovery", "Variant Hunting",
      "Coverage-Guided Discovery", "Attack Surface Reduction"],
    t5: ["Glitching Rigs", "Power Analysis", "Chip Decapping", "Bus Sniffing", "Secure Element Study",
      "Boot Chain Review", "Radio Protocol Analysis", "Fault Model Design"],
    t6: ["Zero Trust Rollout", "Detection Engineering", "Incident Command", "Purple Team Practice",
      "Hardening Baselines", "Key Management Programme", "Compromise Recovery", "Security By Default"],
    t7: ["Named In The CVE", "The Bug Nobody Else Saw", "Ghost In The Machine",
      "Disclosure At Scale", "The Standard You Wrote"],
  },
  community: {
    gate: ["Showing Up", "The work is only half of it. The other half is other people."],
    subs: [
      ["Open: Teaching", "Turning what you know into what they know."],
      ["Open: Stewardship", "Looking after something bigger than your commits."],
      ["Open: Legacy", "What keeps going after you stop."],
      ["Open: Platforms", "The rooms where the work gets discussed."],
      ["Open: Institutions", "Structures that outlast their founders."],
      ["Open: The Record", "What the field remembers."],
    ],
    kinds: ["luck", "knowledge", "genGroup", "currency", "output", "income", "crossCurrency", "autoClean"],
    cross: "business",
    gens: PEOPLE,
    t1: ["Answering Questions", "Writing Issues Well", "Good First Issues", "Changelogs", "Release Notes",
      "Code Of Conduct", "Triage Rota", "Saying Thank You", "Reproducible Reports", "Welcoming Newcomers",
      "Labelling Discipline", "Public Roadmaps"],
    t2: ["Documentation", "Tutorials", "Conference Talks", "Meetup Hosting", "A Newsletter", "Podcast Guest",
      "Live Streaming", "Office Hours", "Screencasts", "Workshop Design", "Example Repositories",
      "Migration Guides"],
    t3: ["Mentoring", "Maintainer Handoff", "Governance Model", "Funding The Project", "Working Groups",
      "Standards Participation", "Localisation", "Accessibility Advocacy", "Contributor Ladders",
      "Release Management", "Security Response Team", "Community Metrics"],
    t4: ["Foundation Seat", "Ecosystem Stewardship", "Conference Keynote", "Curriculum Design",
      "Grant Programme", "Fellowship", "Advisory Board", "Cross-Project Diplomacy", "Sponsorship Programme",
      "Succession Planning"],
    t5: ["Editorial Voice", "Audience Trust", "Signal Over Reach", "Community Moderation", "An Event Series",
      "Regional Chapters", "Translation Network", "Archive Keeping"],
    t6: ["An Endowment", "Charter And Bylaws", "Independent Governance", "A Neutral Home",
      "Long-Term Funding", "Institutional Memory", "Fair Process", "Legitimacy"],
    t7: ["A Generation Learned From You", "The Community Runs Itself", "Everyone Knows The Name",
      "The Project Outlives Its Founder", "Named In The Acknowledgements"],
  },
  research: {
    gate: ["Research Practice", "Read, reproduce, question. Then write something nobody has."],
    subs: [
      ["Open: Method", "Doing it so someone else could do it again."],
      ["Open: Formalism", "Results that hold without an experiment."],
      ["Open: The Long Record", "Work measured in decades."],
      ["Open: Instruments", "Building the thing that measures the thing."],
      ["Open: Synthesis", "Where separate fields turn out to be one."],
      ["Open: Canon", "Work the next century starts from."],
    ],
    kinds: ["knowledge", "output", "currency", "crossCurrency", "clickPct", "offline", "luck", "cheaper"],
    cross: "algorithms",
    t1: ["Reading Papers", "Reproducing Results", "Literature Reviews", "Structured Notes",
      "Hypothesis Framing", "Honest Baselines", "Ablations", "Experiment Logs", "Citation Discipline",
      "Statistical Literacy", "Journal Clubs", "Poster Sessions"],
    t2: ["Novel Benchmarks", "Peer Review", "Preprints", "Collaboration", "Grant Writing",
      "Reproducible Artifacts", "Negative Results", "Survey Papers", "Registered Reports", "Data Sharing",
      "Code Release", "Conference Rebuttals"],
    t3: ["New Formalism", "Complexity Bounds", "Impossibility Results", "Constructive Proofs",
      "Cross-Disciplinary Work", "Theory To Practice", "Open Problems", "Long Horizons", "Axiomatic Framing",
      "Counterexample Hunting", "Proof Assistants", "Category-Theoretic Views"],
    t4: ["Field-Defining Paper", "Award Committee", "Lab Direction", "Decade-Long Programme",
      "Textbook Authorship", "A Named Conjecture", "Programme Committee Chair", "A Research Agenda",
      "Doctoral Supervision", "Funding Strategy"],
    t5: ["Custom Apparatus", "Measurement Theory", "Open Instrumentation", "Calibration Standards",
      "Simulation Fidelity", "Benchmark Stewardship", "Dataset Curation", "Error Bars That Mean Something"],
    t6: ["Unifying Frameworks", "Bridging Disciplines", "Translation To Industry", "Second-Order Effects",
      "Research Infrastructure", "Consensus Building", "Paradigm Articulation", "Intellectual Lineage"],
    t7: ["The Theorem Bears Your Name", "A Field Reorganised", "Proof Beyond Doubt",
      "Cited Until It Is Anonymous", "The Question Nobody Had Asked"],
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

  /**
   * The later global gateways. The first three ask for breadth — branches opened;
   * the next three ask for depth — those branches taken to their third sub-path;
   * the last one asks for everything.
   */
  const globals = [
    ["g1", "Two Ways To Learn", "Reasoning and machinery, held at the same time. ×1.5 to all output.",
      ["b_algorithms", "b_systems"], 260, 0.5],
    ["g2", "The Wide Net", "Quality, commerce and data, all open at once. ×2 to all output.",
      ["b_craft", "b_business", "b_data"], 4200, 1],
    ["g3", "Nothing Left To Open", "Every faucet running. ×3 to all output and every branch currency.",
      ["b_security", "b_community", "b_research"], 65000, 2],
    ["g4", "Second Wind", "Two branches taken past their surface. ×4 to all output.",
      ["algorithms_s3", "systems_s3"], 4.2e5, 3],
    ["g5", "The Deep End", "Three more branches, three sub-paths down. ×5 to all output.",
      ["craft_s3", "business_s3", "data_s3"], 6.5e6, 4],
    ["g6", "All The Way Down", "The last three branches, opened to their theory. ×6 to all output.",
      ["security_s3", "community_s3", "research_s3"], 1.1e8, 5],
    ["g7", "The End Of The Map", "Every sub-path in every branch is open. ×10 to everything.",
      BRANCH_ORDER.map((b) => `${b}_s6`), 4e10, 9],
  ];
  for (const [id, name, desc, req, cost, power] of globals) {
    out.push({
      id, branch: "global", name, tier: 0, gateway: true, desc,
      req, currency: "kp", cost, costGrowth: 1, maxLevel: 1,
      kind: "output", power,
    });
  }

  /* --- per branch: 6 sub-gateways + 67 upgradable skills --- */
  for (const b of BRANCH_ORDER) {
    const c = BRANCH_CONTENT[b];
    const subIds = [1, 2, 3, 4, 5, 6].map((i) => `${b}_s${i}`);
    const subCost = [140, 3200, 90000, 2.4e6, 7e7, 2.2e9];

    c.subs.forEach((s, i) => {
      out.push({
        id: subIds[i], branch: b, name: s[0], tier: 0, gateway: true,
        desc: `${s[1]} Unlocks tier ${i + 2} of ${b}.`,
        req: [i === 0 ? branchGateId(b) : subIds[i - 1]],
        currency: b, cost: subCost[i], costGrowth: 1, maxLevel: 1,
        kind: "currency", power: 0.15,
      });
    });

    const tiers = [c.t1, c.t2, c.t3, c.t4, c.t5, c.t6, c.t7];
    const t6ids = [];

    tiers.forEach((names, ti) => {
      const tier = ti + 1;
      const [baseCost, growth, maxLevel] = TIER_SHAPE[tier];
      names.forEach((name, ni) => {
        // the rotation shifts by tier, so a branch reads as a progression rather than
        // the same eight cards seven times over
        let kind = c.kinds[(ni + ti) % c.kinds.length];
        if (tier === 7) {
          kind = ["output", "currency", "crossCurrency", c.kinds[0], c.kinds[1]][ni];
        }
        let power = round6(POWER[kind][ti] * JITTER[ni % JITTER.length]);
        if (kind === "bugSlow" && c.invertBugs) power = round6(-power * 1.4);

        const gens = kind === "genGroup" ? c.gens ?? MACHINES : undefined;
        const target = kind === "currency" ? b : kind === "crossCurrency" ? c.cross : undefined;
        const ctx = {
          curName: CUR_NAMES[b],
          crossName: CUR_NAMES[c.cross],
          gensLabel: gens ? GEN_LABELS[gens.join(",")] ?? "your tools" : "",
        };

        const id = `${b}_${tier}_${slug(name)}`;
        if (tier === 6) t6ids.push(id);

        // costs fan out a little across a tier so the order you buy in matters
        const cost = Math.round(baseCost * (1 + ni * 0.34) * (kind === "currency" ? 1.6 : 1));

        let req;
        if (tier === 1) req = [branchGateId(b)];
        else if (tier === 7) req = [0, 1, 2, 3].map((k) => t6ids[(ni * 2 + k) % t6ids.length]);
        else req = [subIds[tier - 2]];

        out.push({
          id, branch: b, name, tier, req,
          desc: describe(kind, power, ctx),
          currency: b, cost, costGrowth: growth, maxLevel,
          kind, power,
          ...(gens ? { gens } : {}),
          ...(target ? { target } : {}),
          ...(tier === 7 ? { reqLevel: 3 } : {}),
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
  ["spec", "📜", "Executable Specification"], ["synth", "⚗️", "Program Synthesiser"],
  ["fleet", "🛠️", "Self-Healing Fleet"], ["campus", "🏛️", "Research Campus"],
  ["foundry", "🔬", "Silicon Foundry"], ["orbital", "🛰️", "Orbital Data Centre"],
  ["civ", "🌍", "Civilisation-Scale Compiler"], ["singular", "✴️", "The Singularity Intern"],
];
const GEN_BASE = {
  notepad: 10, duck: 120, so: 1500, ide: 2.2e4, snips: 2.8e5, tests: 3.6e6,
  ci: 5e7, junior: 7e8, oss: 1.2e10, pair: 1.9e11, farm: 2.9e12, swarm: 4.4e13,
  spec: 6.8e14, synth: 1.05e16, fleet: 1.6e17, campus: 2.5e18,
  foundry: 3.9e19, orbital: 6e20, civ: 9.3e21, singular: 1.45e23,
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
  ["📶", "Fast Internet"], ["🔌", "A UPS Under The Desk"], ["🗒️", "Inbox Zero"],
  ["🪞", "Fewer Tabs"], ["🧴", "A Clean Desk"], ["🎚️", "A Calibrated Monitor"],
  ["🕶️", "Blue Light Filter"], ["🥗", "Eating Properly"], ["🚲", "The Commute You Chose"],
  ["📿", "A Shutdown Ritual"], ["🌗", "Your Own Hours"], ["🧑‍💻", "One Machine, Set Up Right"],
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
  ["🧊", "A Very Large Cheque"], ["🧑‍💼", "A Sales Hire"], ["🌐", "A Real Website"],
  ["📇", "A CRM You Actually Use"], ["⏱️", "Net Thirty, Enforced"], ["🎯", "Niching Down"],
  ["🪧", "A Case Study Page"], ["🧑‍🔧", "A Support Retainer"], ["🏔️", "A Premium Tier"],
];
const CLICK_POOL = [
  ["⌨️", "Mechanical Keyboard"], ["➡️", "Vim Motions"], ["👐", "Touch Typing"],
  ["🦾", "Split Ergonomic Keyboard"], ["🖱️", "A Mouse You Never Use"], ["⚡", "Custom Keybindings"],
  ["📋", "Clipboard Manager"], ["🔤", "Text Expander"], ["🪄", "Multi-Cursor Everything"],
  ["🧭", "Fuzzy File Jump"], ["🔁", "Macro Recording"], ["🎹", "Home Row Mods"],
  ["🧊", "Lubed Switches"], ["📏", "Tenting The Board"], ["🖐️", "Wrist Rest"],
  ["🕹️", "Foot Pedals, Genuinely"], ["🧠", "Muscle Memory"], ["🌀", "Typing Without Looking"],
  ["♾️", "The Keyboard Disappears"], ["✍️", "Thought To Text"],
  ["🧤", "Warm Hands"], ["🖲️", "A Trackball, Briefly"], ["📱", "A Second Layer"],
  ["🎛️", "A Macro Pad"], ["🫱", "Chording"], ["🪜", "Snippet Triggers"],
  ["🔕", "No Interruptions"], ["🌪️", "Flow On Demand"],
];
const BUG_POOL = [
  ["🧹", "Linter Config"], ["🚦", "Merge Gate"], ["🎲", "Fuzz Testing"], ["📡", "Observability Stack"],
  ["🔍", "Error Tracking"], ["🧪", "A Staging Environment"], ["🧯", "Feature Flags"],
  ["📋", "Runbooks"], ["🔔", "Alerts That Mean Something"], ["🧊", "Freeze Before Release"],
  ["🔬", "Root Cause Analysis"], ["📝", "Blameless Postmortems"], ["🛡️", "Type Checking"],
  ["🧷", "Assertions In Production"], ["🪞", "Shadow Traffic"], ["🐤", "Canary Deploys"],
  ["↩️", "One-Click Rollback"], ["🧮", "Invariant Checks"], ["🧱", "Deterministic Builds"],
  ["🕸️", "Dependency Pinning"], ["🚧", "Pre-Commit Hooks"], ["📉", "Error Budgets"],
  ["🧿", "Chaos Testing"], ["🏗️", "Rewrite The Bad Module"],
  ["🧫", "A Regression Suite"], ["🧰", "Debug Tooling"], ["🩺", "Health Checks"],
  ["📚", "A Bug Journal"], ["⛔", "Failing Fast"], ["🧊", "Immutable Data"],
  ["🔒", "Narrow Interfaces"], ["🧑‍⚖️", "A Definition Of Done"],
];
const KNOW_POOL = [
  ["✍️", "Technical Blog"], ["📘", "Write The Book"], ["📖", "Reading Group"],
  ["🎓", "A Real Course"], ["🗣️", "Explaining It To Someone"], ["🗂️", "A Second Brain"],
  ["🔖", "Annotated Papers"], ["🧑‍🏫", "Teaching A Class"], ["🧪", "A Side Experiment"],
  ["🧭", "A Mentor"], ["📺", "Watching The Talks"], ["🧵", "Long-Form Threads"],
  ["🗃️", "Your Own Wiki"], ["🔁", "Spaced Repetition"], ["🧑‍🔬", "A Research Sabbatical"],
  ["🌌", "Understanding The Whole Stack"],
  ["🧑‍🎓", "Studying Again"], ["🗒️", "Better Notes"], ["🎧", "Podcasts On The Walk"],
  ["🧑‍🤝‍🧑", "A Study Partner"], ["🏛️", "University Access"], ["📡", "Following The Field"],
  ["🔬", "Replicating A Result"], ["🌐", "Reading The Source"],
];
const OFFLINE_POOL = [
  ["🌙", "A Sleep Schedule"], ["🕰️", "A Batch Job Before Bed"], ["📴", "The Weekend Off"],
  ["🛰️", "Nightly Builds"], ["🧊", "Cold Start Warmup"], ["🏝️", "Two Weeks Away"],
  ["🔋", "Battery Backup"], ["🌅", "Overnight Runs"], ["📦", "A Queue That Drains Itself"],
  ["🛌", "Eight Hours, Actually"], ["🌍", "Follow The Sun"], ["♾️", "It Never Stops"],
];
const LUCK_POOL = [
  ["🍀", "Simply Being Around"], ["📬", "An Open Inbox"], ["🤝", "Weak Ties"],
  ["🎟️", "The Conference Hallway"], ["📣", "Posting In Public"], ["🧲", "Inbound Curiosity"],
  ["🗺️", "Wide Surface Area"], ["🎣", "Long Shots, Often"], ["🔔", "Alerts On Keywords"],
  ["🚪", "Saying Yes Early"], ["🌠", "Right Time, Right Room"], ["♾️", "Manufactured Serendipity"],
];

const BRANCH_UPGRADES = {
  algorithms: [["♟️", "Competitive Practice"], ["📐", "Whiteboard Discipline"], ["🧩", "Puzzle Habit"],
    ["🧮", "Complexity Budget"], ["🔬", "Micro-Benchmarks"], ["🧠", "Pattern Library"],
    ["🎯", "Reduce, Then Solve"], ["♾️", "Asymptotically Free"],
    ["🧭", "Invariant Hunting"], ["⏱️", "Constant Factors"], ["🧊", "Precompute Everything"],
    ["🌌", "The Shape Of The Problem"]],
  systems: [["🐧", "A Linux Box Under The Desk"], ["📊", "Flame Graphs"], ["🔧", "Kernel Tuning"],
    ["🧊", "Cold Storage Tier"], ["🛰️", "Multi-Region"], ["⚙️", "Custom Scheduler"],
    ["🧯", "Graceful Degradation"], ["♾️", "Always On"],
    ["🧵", "Pinned Threads"], ["📦", "Immutable Images"], ["🛡️", "Blast Radius Limits"],
    ["🌌", "One Machine, Everywhere"]],
  craft: [["📏", "House Style"], ["👀", "Mandatory Review"], ["🧪", "Test First, Always"],
    ["🗜️", "Delete More Than You Add"], ["🧭", "Architecture Decision Records"], ["🧼", "Boy Scout Rule"],
    ["🛡️", "Defensive Boundaries"], ["♾️", "Provably Correct"],
    ["🧾", "Changelogs That Explain"], ["🔍", "Reading Before Writing"], ["✅", "Verification In CI"],
    ["🌌", "Nothing Left To Simplify"]],
  business: [["💼", "A Real Contract Template"], ["📞", "Discovery Calls"], ["🏷️", "Published Pricing"],
    ["🤲", "Deposit Up Front"], ["📊", "Unit Economics"], ["🧾", "Automated Billing"],
    ["🏛️", "Legal Entity"], ["♾️", "Money While You Sleep"],
    ["📇", "A Pipeline Worth Tracking"], ["🧮", "Revenue Forecasting"], ["🏦", "A Treasury Policy"],
    ["🌌", "Capital Compounds"]],
  data: [["🗄️", "A Real Warehouse"], ["🧊", "Columnar Everything"], ["🔎", "Query Profiler"],
    ["🧬", "Schema Registry"], ["📈", "Live Dashboards"], ["🪣", "Object Storage"],
    ["🧮", "Precomputed Rollups"], ["♾️", "Instant Answers"],
    ["🧭", "One Source Of Truth"], ["🧪", "Backtested Metrics"], ["🛰️", "Streaming Everything"],
    ["🌌", "The Model Sees It First"]],
  security: [["🔓", "A Lab Environment"], ["📮", "Private Bounty Programme"], ["🧬", "Symbolic Execution"],
    ["🕶️", "Coordinated Disclosure"], ["⛓️", "Chained Primitives"], ["🧨", "Proof-Of-Concept Craft"],
    ["🗝️", "A Researcher Network"], ["♾️", "Nothing Is Closed To You"],
    ["🧯", "Containment Playbooks"], ["🧿", "Continuous Assurance"], ["🗄️", "A Findings Archive"],
    ["🌌", "Trusted By Default"]],
  community: [["📣", "A Following"], ["🎪", "Running A Conference"], ["🧑‍🏫", "A Mentoring Programme"],
    ["💝", "Sponsors"], ["🌍", "Translated Docs"], ["🏅", "Contributor Awards"],
    ["🏛️", "A Foundation"], ["♾️", "It Outlives You"],
    ["🗺️", "Local Chapters"], ["📖", "A Written Charter"], ["💼", "An Endowment Fund"],
    ["🌌", "A Name In The Field"]],
  research: [["📄", "First Publication"], ["🔁", "Reproduction Package"], ["🧑‍🔬", "A Lab"],
    ["💰", "Funded Grant"], ["🏆", "Best Paper"], ["📚", "Cited Everywhere"],
    ["🧭", "Setting The Agenda"], ["♾️", "A New Field"],
    ["🧰", "Your Own Instruments"], ["🧑‍🎓", "A Doctoral Cohort"], ["📡", "A Long Programme"],
    ["🌌", "The Canon Cites You"]],
};

const TRACK_UPGRADES = {
  product: [["📊", "Analytics Dashboard"], ["🚩", "Feature Flags"], ["🤝", "Enterprise Contract"],
    ["🗺️", "Own The Roadmap"], ["🧲", "Product-Led Growth"], ["🏆", "Category Definition"],
    ["🧪", "Continuous Discovery"], ["🌍", "Multi-Market Launch"], ["🏛️", "A Platform Ecosystem"],
    ["♾️", "The Default Choice"]],
  game: [["🧱", "Level Editor"], ["💡", "Ray Tracing"], ["🕹️", "Store Front Page"],
    ["⚙️", "Your Own Engine"], ["🎬", "A Real Trailer"], ["🏆", "Game Of The Year"],
    ["🌐", "Live Service"], ["🧑‍🤝‍🧑", "A Modding Scene"], ["🎼", "An Original Score"],
    ["♾️", "A Franchise"]],
  security: [["🔬", "Disassembler"], ["📮", "Private Bug Bounty"], ["⛓️", "Exploit Chain"],
    ["🕶️", "Disclosure Programme"], ["🧿", "Threat Intel Feed"], ["🏆", "Pwn Of The Year"],
    ["🧬", "Variant Analysis Pipeline"], ["🏛️", "A Standards Seat"], ["🛡️", "Defence Consultancy"],
    ["♾️", "The Reference Advisory"]],
  kernel: [["🥾", "Custom Bootloader"], ["🔗", "Lock-Free Queues"], ["📥", "Upstream Merge"],
    ["💿", "Your Own OS"], ["🧊", "Real-Time Patches"], ["🏆", "Maintainer Of Record"],
    ["🔒", "A Formally Verified Core"], ["🌐", "Every Architecture"], ["🏛️", "A Governance Board"],
    ["♾️", "It Boots Everywhere"]],
  ai: [["🎛️", "GPU Cluster Time"], ["🗂️", "Clean Dataset"], ["📄", "Published Paper"],
    ["🛰️", "Frontier Run"], ["🧪", "Eval Harness"], ["🏆", "State Of The Art"],
    ["🧠", "Reasoning Traces"], ["🌐", "Open Weights Release"], ["🏛️", "A Safety Programme"],
    ["♾️", "General Enough"]],
  compiler: [["🔍", "Peephole Passes"], ["📎", "Inline Everything"], ["⚡", "JIT Tier-Up"],
    ["📚", "Standard Library"], ["🧬", "Auto-Vectorisation"], ["🏆", "The Reference Implementation"],
    ["🧮", "Whole-Program Optimisation"], ["🌐", "A Second Backend"], ["🏛️", "Language Committee"],
    ["♾️", "Everything Compiles To It"]],
  embedded: [["📟", "Logic Analyser"], ["🔧", "Board Bring-Up"], ["🏗️", "Fab Partnership"],
    ["📦", "Ships By The Million"], ["🔋", "Energy Harvesting"], ["🏆", "Design Win"],
    ["📡", "A Radio Stack"], ["🧊", "Sub-Milliwatt Idle"], ["🏛️", "An Industry Standard"],
    ["♾️", "In Every Device"]],
};

const ROMAN = ["", " II", " III", " IV", " V", " VI"];

function ladder(pool, tiers, family, mk) {
  const out = [];
  const total = pool.length * tiers;
  for (let t = 0; t < tiers; t++) {
    pool.forEach(([emoji, name], i) => {
      const step = t * pool.length + i;
      out.push({ emoji, name: name + ROMAN[t], family, ...mk(step, t, i, total) });
    });
  }
  return out;
}

/** Spread a ladder's rank requirement evenly over the ranks it has to last for. */
const rankOver = (step, total, from) =>
  Math.min(15, from + Math.floor((step * (15 - from)) / Math.max(1, total - 1)));

function buildUpgrades() {
  const out = [];
  let n = 0;
  const push = (u) => { out.push({ id: `u${(n++).toString(36)}_${slug(u.name)}`, ...u }); };

  /* generator tiers: 20 × 8 = 160 */
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

  /* global output: 48 × 3 = 144 */
  ladder(OUTPUT_POOL, 3, "output", (step, _t, _i, total) => ({
    desc: `+${10 + step}% to all code output.`,
    cost: Math.round(4e4 * Math.pow(1.72, step)),
    fx: { all: 1 + (10 + step) / 100 },
    reqRank: rankOver(step, total, 1),
  })).forEach(push);

  /* income: 36 × 3 = 108 */
  ladder(INCOME_POOL, 3, "income", (step, _t, _i, total) => ({
    desc: `×${(1.2 + step * 0.09).toFixed(2)} income.`,
    cost: Math.round(9e4 * Math.pow(1.8, step)),
    fx: { money: 1.2 + step * 0.09 },
    reqRank: rankOver(step, total, 2),
  })).forEach(push);

  /* click: 28 × 3 = 84 */
  ladder(CLICK_POOL, 3, "click", (step) => ({
    desc: `×${(1.5 + step * 0.16).toFixed(2)} click power.`,
    cost: Math.round(150 * Math.pow(2.4, step)),
    fx: { click: 1.5 + step * 0.16 },
    reqClicks: 40 + step * 260,
  })).forEach(push);

  /* bugs & quality: 32 × 3 = 96 — slower bugs, then softer bugs, then a bigger broom */
  ladder(BUG_POOL, 3, "quality", (step, t) => ({
    desc:
      t === 0
        ? `Bugs appear ${8 + step}% slower.`
        : t === 1
          ? `Bugs throttle you ${Math.min(70, 8 + step)}% less.`
          : `×${(1.3 + (step - 64) * 0.06).toFixed(2)} bugs closed per debug session.`,
    cost: Math.round(1.5e5 * Math.pow(1.95, step)),
    fx:
      t === 0
        ? { bugRate: 1 - (8 + step) / 100 }
        : t === 1
          ? { sev: 1 - Math.min(70, 8 + step) / 100 }
          : { debug: 1.3 + (step - 64) * 0.06 },
    reqBugsKilled: 20 + step * 220,
  })).forEach(push);

  /* knowledge: 24 × 3 = 72 */
  ladder(KNOW_POOL, 3, "knowledge", (step, _t, _i, total) => ({
    desc: `×${(1.3 + step * 0.12).toFixed(2)} knowledge gain.`,
    cost: Math.round(1.2e6 * Math.pow(2.05, step)),
    fx: { kp: 1.3 + step * 0.12 },
    reqRank: rankOver(step, total, 3),
  })).forEach(push);

  /* offline: 12 × 3 = 36 — the rate is a ceiling, the cap simply adds up */
  ladder(OFFLINE_POOL, 3, "offline", (step, _t, _i, total) => ({
    desc: `Offline earning at ${Math.min(95, 52 + step)}% and +1h of cap.`,
    cost: Math.round(5e6 * Math.pow(3.2, step)),
    fx: { offEff: Math.min(0.95, 0.52 + step / 100), offCap: 1 },
    reqRank: rankOver(step, total, 2),
  })).forEach(push);

  /* luck: 12 × 3 = 36 */
  ladder(LUCK_POOL, 3, "luck", (step, _t, _i, total) => ({
    desc: `×${(1.15 + step * 0.05).toFixed(2)} opportunity frequency.`,
    cost: Math.round(8e6 * Math.pow(3.1, step)),
    fx: { luck: 1.15 + step * 0.05 },
    reqRank: rankOver(step, total, 3),
  })).forEach(push);

  /* branch-flavoured: 8 × 12 = 96 */
  for (const b of BRANCH_ORDER) {
    BRANCH_UPGRADES[b].forEach(([emoji, name], i) => {
      push({
        emoji, name, family: `branch:${b}`,
        desc: `+${15 + i * 10}% ${CUR_NAMES[b]} gain and +${8 + i * 4}% output.`,
        cost: Math.round(2e5 * Math.pow(6.5, i)),
        fx: { cur: { [b]: 1 + (15 + i * 10) / 100 }, all: 1 + (8 + i * 4) / 100 },
        reqBranch: b,
      });
    });
  }

  /* track-exclusive: 7 × 10 = 70 */
  const TRACK_FX = [
    { all: 1.4 }, { money: 2 }, { all: 1.8, money: 1.5 },
    { all: 2.4 }, { all: 2, kp: 2 }, { all: 3, money: 3 },
    { all: 4, kp: 2.5 }, { all: 5, money: 4 }, { all: 7, kp: 4 },
    { all: 10, money: 6, kp: 5 },
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
        reqRank: Math.min(15, 4 + i),
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

/* integrity: ids unique, prerequisites real, and the catalogue shaped as PLAN.md says */
const ids = new Set();
for (const s of skills) {
  if (ids.has(s.id)) throw new Error(`duplicate skill id: ${s.id}`);
  ids.add(s.id);
}
for (const s of skills) {
  for (const r of s.req) if (!ids.has(r)) throw new Error(`${s.id} requires missing ${r}`);
}

const names = new Set();
for (const s of skills) {
  if (names.has(s.name)) throw new Error(`duplicate skill name: ${s.name}`);
  names.add(s.name);
}

/* two skills in one branch and tier must not read identically */
const blurbs = new Map();
for (const s of skills) {
  const k = `${s.branch}|${s.tier}|${s.desc}`;
  if (blurbs.has(k)) throw new Error(`${s.id} reads exactly like ${blurbs.get(k)}`);
  blurbs.set(k, s.id);
}

for (const s of skills) {
  if (s.gateway && (s.maxLevel !== 1 || s.costGrowth !== 1)) {
    throw new Error(`gateway ${s.id} must be a single purchase`);
  }
  if (!s.gateway && (s.maxLevel < 3 || s.maxLevel > 12)) {
    throw new Error(`${s.id} has ${s.maxLevel} levels, expected 3..12`);
  }
  if ((s.kind === "currency" || s.kind === "crossCurrency") && s.target && !BRANCH_CONTENT[s.target]) {
    throw new Error(`${s.id} targets unknown branch ${s.target}`);
  }
}

for (const b of BRANCH_ORDER) {
  const mine = skills.filter((s) => s.branch === b);
  const gates = mine.filter((s) => s.gateway);
  if (gates.length !== 7) throw new Error(`${b} has ${gates.length} gateways, expected 7`);
  if (mine.length - gates.length !== 67) {
    throw new Error(`${b} has ${mine.length - gates.length} upgradable skills, expected 67`);
  }
}

/* every tool the skill data points at must exist, or a genGroup skill boosts nothing */
const genIds = new Set(GENERATORS.map((g) => g[0]));
for (const s of skills) {
  for (const g of s.gens ?? []) if (!genIds.has(g)) throw new Error(`${s.id} boosts unknown tool ${g}`);
}

const uids = new Set();
for (const u of upgrades) {
  if (uids.has(u.id)) throw new Error(`duplicate upgrade id: ${u.id}`);
  uids.add(u.id);
}
console.log("integrity: ok");
