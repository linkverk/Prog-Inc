---
type: concept
id: faucet-antagonism
updated: 2026-09-03
sources: [plan-md]
code: [src/core/engine.ts, src/data/branches.ts]
---

# Faucet antagonism — Craft vs Security

[[craft]] earns Trust **per bug closed**. [[security]] earns Findings **per bug that appears**.
Craft costs 90 KP to open, Security 320, and both are buyable in the same run.

They fight over one tap. Craft's whole skill set — `bugSlow`, `bugSoften`, `debugPower`,
`autoClean` — reduces the number of bugs in existence. Security's income *is* that number.
Invest in Craft and Security's faucet dries up; invest in Security and you are choosing to
live with defects you already have the tools to remove.

`src/data/branches.ts:60` says it in the data itself: Findings is *"the tap Craft is trying
to close."*

## Why this is the good kind of conflict

Most idle games make branches additive — every branch you open makes every number bigger, so
the only question is order. Here one pair is genuinely subtractive, which means:

- opening both is a real decision with a real cost, not a completionist checkbox
- a run that skips Craft plays differently, not just slower
- the tier-5 capstone of either branch is worth more in a run that committed to one side

## Open question

**Unverified**: does the antagonism actually bite at the numbers as implemented, or does
`autoClean` outpace bug spawn so hard that Findings collapses to nothing the moment any Craft
skill is bought? Nobody has measured it. Needs a run with both branches open and Findings/s
logged against Craft investment. Until then "possible but throttled" is intent, not fact.
