import type { Fx, TrackId } from "../core/types";
import { MACHINE_IDS } from "./generators";

export type SignatureKind =
  | "release"
  | "hype"
  | "bounty"
  | "kernel"
  | "scaling"
  | "passes"
  | "budget";

export interface Track {
  id: TrackId;
  emoji: string;
  name: string;
  tag: string;
  sub: string;
  bullets: string[];
  sig: SignatureKind;
  fx: Fx;
  /** rank titles for rungs 3..15 */
  ladder: string[];
  /** editor flavour lines, already syntax-highlighted */
  snips: string[];
}

export const TRACKS: Track[] = [
  {
    id: "product",
    emoji: "🚀",
    name: "Product Engineer",
    tag: "ship it",
    sub: "Features, users, revenue. You are measured in things that went live.",
    bullets: [
      "×2.5 income and +15% output",
      "Every 45s you cut a release for a cash bonus",
      "The bonus scales with everything written since the last one",
    ],
    sig: "release",
    fx: { money: 2.5, all: 1.15 },
    ladder: ["Intern on the Web Team", "Junior Product Engineer", "Full-Stack Developer", "Senior Product Engineer", "Feature Owner", "Product Tech Lead", "Principal Product Engineer", "Head of Engineering", "VP of Engineering", "Chief Technology Officer", "Founder-Engineer", "The One Who Shipped It", "Industry Standard"],
    snips: [
      '<span class="k">export const</span> <span class="f">Checkout</span> = () =&gt; {',
      '<span class="c">// A/B: variant B converts 4.2% better</span>',
      '<span class="k">await</span> <span class="f">billing</span>.<span class="f">charge</span>({ amount });',
      '<span class="f">track</span>(<span class="s">"signup_completed"</span>, { plan });',
    ],
  },
  {
    id: "game",
    emoji: "🎮",
    name: "Game Developer",
    tag: "build worlds",
    sub: "Frame budgets, physics, and one more polish pass at 3am.",
    bullets: [
      "×6 click power",
      "Clicking builds Hype, which multiplies all output up to ×10",
      "Hype bleeds away when you stop playing",
    ],
    sig: "hype",
    fx: { click: 6 },
    ladder: ["Modder", "Junior Gameplay Programmer", "Gameplay Programmer", "Engine Programmer", "Senior Engine Programmer", "Technical Director", "Lead Engine Architect", "Studio Tech Director", "Indie Studio Founder", "Game of the Year Winner", "Engine Author", "Genre Inventor", "Legend of the Craft"],
    snips: [
      '<span class="k">void</span> <span class="f">Update</span>(<span class="k">float</span> dt) { pos += vel * dt; }',
      '<span class="c">// 16.6ms budget, currently at 14.2ms</span>',
      '<span class="f">renderer</span>.<span class="f">drawBatch</span>(sprites, <span class="n">2048</span>);',
      '<span class="k">if</span> (player.<span class="f">grounded</span>) vel.y = JUMP_IMPULSE;',
    ],
  },
  {
    id: "security",
    emoji: "🔓",
    name: "Security Researcher",
    tag: "break it first",
    sub: "You read code looking for the one line everybody else skimmed.",
    bullets: [
      "Bugs no longer throttle you — they are findings",
      "Findings appear 4× as fast, and pay bounties",
      "Submit findings for a cash and knowledge payout",
    ],
    sig: "bounty",
    fx: { bugRate: 4, sev: 0 },
    ladder: ["Script Kiddie", "CTF Competitor", "Bug Bounty Hunter", "Penetration Tester", "Red Team Operator", "Exploit Developer", "Vulnerability Researcher", "Zero-Day Author", "Head of Offensive Security", "Chief Information Security Officer", "Nation-State Grade", "The Name in the CVE", "Ghost in the Machine"],
    snips: [
      '<span class="f">memcpy</span>(buf, input, len); <span class="c">// len is attacker-controlled</span>',
      '<span class="k">payload</span> = <span class="s">"A"</span>*<span class="n">264</span> + <span class="f">p64</span>(rop);',
      '<span class="c"># CVE-2026-0117 · CVSS 9.8 · confirmed</span>',
      '<span class="k">for</span> off <span class="k">in</span> <span class="f">range</span>(<span class="n">0</span>, <span class="n">0x1000</span>, <span class="n">8</span>): <span class="f">leak</span>(off)',
    ],
  },
  {
    id: "kernel",
    emoji: "🐧",
    name: "Kernel & OS Developer",
    tag: "closest to the metal",
    sub: "Schedulers, page tables, and code that must never, ever crash.",
    bullets: [
      "Machines produce ×4 — every tool that is not a person",
      "Each promotion is worth far more (×1.32 instead of ×1.14)",
      "Offline progress runs at 100% with a 14h cap",
    ],
    sig: "kernel",
    fx: { gens: MACHINE_IDS, genMult: 4, offEff: 1, offCap: 12 },
    ladder: ["Distro Tinkerer", "Driver Author", "Kernel Contributor", "Subsystem Maintainer", "Senior Kernel Engineer", "Scheduler Architect", "Kernel Maintainer", "OS Architect", "Operating System Author", "Chief Systems Architect", "The Kernel Is Yours", "It Runs On Everything", "Named In The Bootloader"],
    snips: [
      '<span class="k">static inline void</span> <span class="f">tlb_flush</span>(<span class="k">struct</span> mm *mm)',
      '<span class="f">spin_lock_irqsave</span>(&amp;rq-&gt;lock, flags);',
      '<span class="c">/* fixes a race that took nine months to find */</span>',
      '<span class="k">EXPORT_SYMBOL_GPL</span>(<span class="f">sched_setattr</span>);',
    ],
  },
  {
    id: "ai",
    emoji: "🧠",
    name: "AI Engineer",
    tag: "scale is the strategy",
    sub: "Data in, weights out, and a training run you must not interrupt.",
    bullets: [
      "×6 knowledge gain",
      "All output scales with your total knowledge",
      "More KP in the bank means more code out — knowledge stops being just a currency",
    ],
    sig: "scaling",
    fx: { kp: 6 },
    ladder: ["Notebook Tinkerer", "Junior ML Engineer", "Machine Learning Engineer", "Research Engineer", "Senior Research Engineer", "Model Architect", "Training Lead", "Head of Research", "Frontier Lab Founder", "Chief Scientist", "Architecture Namesake", "Scaling Law Discoverer", "Author of the Paper"],
    snips: [
      '<span class="f">loss</span> = <span class="f">cross_entropy</span>(logits, targets)',
      '<span class="c"># step 41200 · loss 1.834 · lr 3e-4</span>',
      '<span class="k">with</span> <span class="f">autocast</span>(<span class="s">"cuda"</span>, bf16):',
      'attn = <span class="f">softmax</span>(q @ k.T / <span class="f">sqrt</span>(d_k)) @ v',
    ],
  },
  {
    id: "compiler",
    emoji: "⚙️",
    name: "Compiler Engineer",
    tag: "tools for tool-makers",
    sub: "You make everyone else's code faster without touching a line of it.",
    bullets: [
      "×2 to all output, but income drops to 60%",
      "Every upgrade you own adds another +3% output",
      "Late runs with a full upgrade shelf get enormous",
    ],
    sig: "passes",
    fx: { all: 2, money: 0.6 },
    ladder: ["Toy Interpreter Author", "Parser Engineer", "Compiler Engineer", "Optimisation Engineer", "Senior Compiler Engineer", "Backend Architect", "Language Designer", "Toolchain Lead", "Standards Committee Member", "Chief Language Architect", "Your Language Is Taught", "The Dragon Book Cites You", "Turing Award Laureate"],
    snips: [
      '<span class="k">match</span> node { <span class="f">Expr</span>::<span class="f">Call</span>(f, a) =&gt; <span class="f">lower</span>(f, a),',
      '<span class="c">// this pass makes every program 4% faster</span>',
      '<span class="k">fn</span> <span class="f">optimize</span>(ir: <span class="f">Graph</span>) -&gt; <span class="f">Graph</span> { <span class="f">fixpoint</span>(ir) }',
      'emit <span class="f">MOV</span> r0, <span class="n">#0x1F</span>  <span class="c">; allocator agrees</span>',
    ],
  },
  {
    id: "embedded",
    emoji: "🔌",
    name: "Embedded Engineer",
    tag: "two kilobytes, perfect",
    sub: "No garbage collector, no second chances, and a deadline in microseconds.",
    bullets: [
      "Every tool costs 50% less, forever",
      "Bugs appear 70% slower — you cannot ship a patch to a toaster",
      "+5% output for each tool you own 25 or more of",
    ],
    sig: "budget",
    fx: { costMult: 0.5, bugRate: 0.3 },
    ladder: ["Arduino Hobbyist", "Firmware Intern", "Firmware Engineer", "Real-Time Systems Engineer", "Senior Embedded Engineer", "Silicon Bring-Up Lead", "Hardware/Software Architect", "Chief Hardware Architect", "Robotics Systems Founder", "Chief Technology Officer", "In Every Device", "Two Kilobytes, Perfect", "The Machine Whisperer"],
    snips: [
      '<span class="f">GPIOA</span>-&gt;<span class="f">ODR</span> ^= (<span class="n">1</span> &lt;&lt; <span class="n">5</span>);  <span class="c">// toggle LED</span>',
      '<span class="c">// stack usage: 412 bytes of 2048</span>',
      '<span class="k">__attribute__</span>((interrupt)) <span class="k">void</span> <span class="f">TIM2_IRQHandler</span>()',
      '<span class="k">static const</span> <span class="k">uint8_t</span> LUT[<span class="n">256</span>] <span class="f">PROGMEM</span> = {',
    ],
  },
];

export const TRACK_BY_ID: Record<TrackId, Track> = Object.fromEntries(
  TRACKS.map((t) => [t.id, t]),
) as Record<TrackId, Track>;
