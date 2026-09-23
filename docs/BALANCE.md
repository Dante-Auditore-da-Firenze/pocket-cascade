# Pocket Cascade Balance

## Starting Lane Follow-up - 2026-09-23

H050 changes only the new-run starting aim from lane 5 to lane 1. Saved aim and
later player choices are not reset. This changes the initial trajectory, not
part effects, targets, prices, power, physics, or automatic difficulty.

The H047/H040 campaign counts below were measured with the earlier centered
opening. Do not apply them unchanged to the new lane-1 opening. The historical
seed-42 recovery regression now explicitly aims at lane 5 through the normal
aim control, including in the browser. Diagnostic runs default to the actual
new-run lane; `--opening-lane=5` explicitly reproduces the earlier opening, and
each result records zero-based `openingLane`. Its route-specific assertions
remain intact. No fresh full eight-seed study is claimed for this small change.

The user asks whether the recent game became easier. H047 did not reduce targets
or strengthen parts; it made recovery more forgiving and assistance a choice.
Opening targets remain 100/300/550, rising to 1,500/3,000/6,000 on commissions
4-6. Familiarity and an early commission are plausible explanations for the
reported feeling, not conclusions about an uninspected live run. Chosen help
or relaxed targets can also affect the experience. No rebalance was requested.

## Recovery and Fairness Follow-up - 2026-09-23

H047 approves the five-priority pass. The ten part effects, targets, prices,
capacity curve, power track, launch budget, and deterministic physics are retained.
Ordinary Retry no longer increases power automatically; the player explicitly
chooses each +10% help step, capped at +30% for one commission. Actual missing
charge, remembered effect, or deposit reserve is recorded in the optional cascade
receipt, without predicting a layout or declaring a machine impossible.

The full new report contains **48 unassisted campaign attempts** on the same
eight seeds and six policies, with up to six earned After Hours stages. Every
recorded help level is zero. It is separate from the older automatically assisted
H040 comparison below; no original reference reports are overwritten.

| Policy | Campaign Wins | After Hours Clears | Needed Installed Changes in 4-9 |
| --- | ---: | ---: | ---: |
| Passive multiplier stack | 0/8 | 0 | 0 |
| Charge-aware recovery | 8/8 | 48 | 14 |
| Proactive charge | 8/8 | 38 | 1 |
| Proactive banking | 6/8 | 34 | 1 |
| Proactive branching | 3/8 | 17 | 1 |
| Frozen after six | 0/8 | 0 | 1 before the freeze |

No recorded simulation timeouts. Every recovery seed still needs a useful
installed change during commissions 4-9. The passive and frozen policies losing
is not itself a balance defect: their owned inventories can often recover through
different arrangements. Banking and especially branching remain harder for these
particular greedy purchase/build policies; their results are not human win rates.

The bounded local audit finds an unassisted recovery for every failed passive,
frozen, and banking campaign, and two of the five branching failures. A separate
detached nine-lane/rebuild audit checks the remaining three:

| Branching Seed / Commission | Target | Existing Payout | Wider Unassisted Payout | Other Witness |
| --- | ---: | ---: | ---: | --- |
| 2026 / 9 | 24,000 | 3,579 | 7,839 | Four identical launches clear; 26 recorded remove/place/local actions. |
| 7 / 12 | 75,000 | 12,317 | 26,053 | Three launches clear; 31 recorded actions. The original board also clears with explicitly accepted +30% help. |
| 99 / 7 | 10,000 | 1,815 | 1,955, still short | Original board pays 2,032 with explicit +10% help, clearing in five launches. |

The full rebuilds preserve credits, power, every owned ID/kind/tuning, and were
settled through the real engine. They are not small human-discoverable edits or
additional campaign wins. The seed-99 search failure is not impossibility; the
separate help witness demonstrates recovery. Across the 23 failed campaign states,
22 have a found unassisted owned-parts witness and one has a chosen-help witness.
This does not establish that all possible inventories or After Hours targets are
winnable. Shop rollback, last-generator retention, and an explicit New workshop
exit form the recovery policy; no hidden power, free rescue parts, adaptive quota,
or runtime solver is introduced.

Evidence: ignored `roles-1790107227971.json` and
`weak-case-audit-1790109101908.json` under artifacts/balance/experiments.
The report CLI now records its retry policy. Default is same difficulty; pass
`--retry-help` for a separate explicitly assisted study. Original H040 tables
below remain historical evidence. D09/D14 retain human decision-quality follow-up
rather than requiring further numerical changes solely to make all policies win.

## Current Rules - 2026-09-12

H040 adopts the ten-part charge/tuning redesign as **normal saved gameplay**.
The former unsaved trial entry is removed. This is a combined, measured pass,
not a claim that all build families or human skill levels are perfectly balanced.

### Roles and Rewards

Tokens start with zero charge and hold at most three. Mint, Relay, and Kicker
generate charge; Doubler spends one and Crown spends two. Echo spends charge for
a repeated multiplication and clears its memory after one repeat. Generators
therefore retain a role even when token base value is high. The power track is
10/14/19/25/32/40/49/59/70, with the existing `6 + 3 * level` upgrade cost.

Vault banks 50% of token value plus 25% per stored charge, consuming that charge.
Deposits are earned points and also create a token reserve. **Dividend** consumes
the reserve to add twice its amount to token value, without removing any earned
banked points. **Junction** pays a combined entry-value deposit when a second
distinct token reaches the same socket in one launch. No token is delayed or
deleted. Fork divides charge and reserves rather than duplicating them.

Every part has one behavior-changing tuning. A free reward offers a new part, a
specific matching owned copy to tune, or two credits. Paid tuning costs part
price plus three. Fusion consumes one matching untuned spare, costs no credits,
and preserves the target ID/socket/direction. It is not unlimited multiplier
leveling; both the effect and the consumed copy are validated by the engine.
Full effects and tunings are in [DESIGN.md](DESIGN.md#part-tuning).

### Current Progression

| Commission | Target | Installed Capacity |
| ---: | ---: | ---: |
| 1 | 100 | 7 |
| 2 | 300 | 8 |
| 3 | 550 | 9 |
| 4 | 1,500 | 9 |
| 5 | 3,000 | 9 |
| 6 | 6,000 | 10 |
| 7 | 10,000 | 10 |
| 8 | 16,000 | 11 |
| 9 | 24,000 | 11 |
| 10 | 36,000 | 12 |
| 11 | 52,000 | 12 |
| 12 | 75,000 | 13 |

Five launches, minimum-score success, free editing, capped overdrive/spare-launch
credit bonuses, and +10% retry help capped at +30% remain. H047 makes that help
explicitly optional; the original measurements below used automatic help. After Hours starts
at 97,500, grows by 1.3x per commission to the existing one-billion target cap,
and grants 14 slots on entry. After Hours 4/7/10/13 open capacities 15/16/17/18.
No larger physical board or increased token population is required. These are
bounded milestones, not infinitely expanding content or endlessly useful tuning.

### Measured Campaigns

[roles-balance.ts](../scripts/roles-balance.ts) uses untouched fresh states,
actual engine transitions, earned money, the shared simulator, and action traces
for building, paid/free tuning, and fusion. Initial screening on seeds 1/42 still
allowed passive stacking through commission 11, so one fixed earlier-target
calibration was applied. A second two-seed screen and final eight-seed report
followed: **72 campaign attempts total**, including repeated conditions, not
72 seeds or 72 wins. Targets never adapt to the player's output during a run.

Final seeds: **1, 42, 2026, 65537, 7, 13, 99, 2027**. Each of six policies attempts
twelve commissions, then up to six earned After Hours commissions for winners.
The harness stops after three retries per commission; the game permits more.

| Policy | Campaign Wins | Campaign Launches | After Hours Clears | Needed Installed Changes in 4-9 |
| --- | ---: | ---: | ---: | ---: |
| Multiplier preference, only add on the observed trail | 0/8 | 363 | 0 | 0 |
| Trail building with charge-aware recovery/tuning | 8/8 | 306 | 48/48 | 14 |
| Proactive charge-focused construction | 8/8 | 160 | 42/48 | 1 |
| Proactive banking preference | 7/8 | 221 | 42/42 | 1 |
| Proactive branching preference | 4/8 | 343 | 24/24 | 3 |
| Strong machine frozen after commission 6 | 0/8 | 350 | 0 | 1 before the freeze |

The passive runs stop after 6-8 clears; the frozen runs after 7-10. Every recovery
seed has at least one necessary installed change during commissions 4-9, rather
than the previous trial's late-only pressure. The real-control browser campaign
checks this same middle-campaign recovery, paid/free tuning, fusion, the complete
campaign, saved/reloaded completion, and four After Hours stages.

Policy names are **not human skill levels**. They know simulated outcomes.
Proactive builders attempt a greedy rebuild and three improving local decisions;
the recovery policy only does local reconfiguration when its remaining launches
cannot clear the target. New placements, lane changes, replacements, and rotations
are recorded separately. A placement-plus-rotation candidate contains two atomic
actions. Policies also use different purchase preferences, so their win-rate
differences are not a pure causal estimate of repositioning alone.

Banking and branch results remain uneven. Bank seed 42 stops at commission 8;
a separate whole-board three-decision audit moves its payout from 2,973 to 4,946
against a 16,000 target, retaining its three credits, power, and owned IDs. Three
of the four failed branch runs have a similar audit recovery; seed 2026 does not
within that search. Seven of eight passive failures and all eight frozen
failures have a next-stage recovery in the audit. Audits do not count as campaign
wins, do not prove human discoverability, and do not grant resources or more than
the existing capped retry boost. These weak cases stay visible for follow-up.

All 48 final runs record zero timeouts and enforce four-token, safe-score,
ownership, capacity, and payout reconciliation during actual simulated drops.
Branch-preference runs trigger 243 Junction deposits across their attempts;
bank-preference runs earn 1,673,246 banked points across campaigns/continuations.
These counts establish actual use of the new interactions, not equal archetype
strength or enjoyment. Exact per-stage boards, banks, joins, charge-starved hits,
shop actions, and failed-state audits remain in the report.

### Evidence and Reproduction

- [Initial combined screen, 12 attempts](../artifacts/balance/experiments/roles-1789159303203.json).
- [Calibrated screen, 12 attempts](../artifacts/balance/experiments/roles-1789159698803.json).
- [Final 48 campaigns and recovery audits](../artifacts/balance/experiments/roles-1789160364557.json).
- [Current real-control campaign regression](../tests/browser/campaign.spec.ts).
- [Current reward/tuning/fusion checks](../tests/browser/rewards.spec.ts).

```powershell
node --import tsx scripts/roles-balance.ts --seeds=1,42 --continuation=3
node --import tsx scripts/roles-balance.ts --seeds=1,42,2026,65537,7,13,99,2027 --continuation=6
npm.cmd test -- tests/parts.test.ts tests/engine.test.ts tests/balance.test.ts
npm.cmd run test:e2e -- tests/browser/campaign.spec.ts tests/browser/rewards.spec.ts
```

The study writes uniquely named JSON/JSONL artifacts. Current browser tests use
5174, separate from player port 5173. Older artifacts below are preserved, but
running their old scripts against today's effects is not a reproduction of their
historical balance. The original 16-run files have not been overwritten.

### Player Solvability Check - 2026-09-12

H041: the user says the redesigned game makes them think and asks whether their
current run can become impossible. Read-only inspection found seed 2457968940,
commission 11 (target 52,000), phase lost, 24,375 on the failed attempt, no launches
left, power 6, one retry already used, nine credits, twelve installed parts and
two spares. Its last drop reproduces exactly at 4,875. Current saved state cannot
reconstruct the player's complete earlier build/purchase history.

The next **Retry commission** resets score to zero and grants five launches at
base value 59 (+20%); it does not retain the failed score. All nine unchanged
lanes were evaluated: best payout 5,318, five-drop total 26,590. Aiming alone is
not sufficient. A detached free-move audit found a constructive recovery, and
an independent legal-action replay verified the minimal first step:

- Swap the installed Crown at 4-3 with the Mint at 4-2. Keep aim at lane 5.
- Each next-retry drop pays **14,364**; four real engine settlements yield
	**57,456**, clearing the 52,000 target with one launch left.
- All fourteen owned IDs, the nine credits, power, tuning, and spare inventory
	are retained. No new gift, purchase, paid tuning, fusion, or automatic live
	edit is required.

The fuller three-edit witness additionally replaces the Doubler at 5-2 with the
owned spare Echo, then moves the displaced Mint from 4-3 to 1-2. It pays 21,752
on that retry and clears in three launches (65,256). After collecting the real
reward and choosing the credit alternative, the unchanged machine pays 18,093
at commission 12's reset base 49 and clears 75,000 in five launches (90,465).
Both stage transitions were replayed through actual engine functions and their
states validated with the save parser. This proves the inspected inventory can
finish the campaign without more purchases; it is not a claim of optimality or
an instruction automatically applied to the user.

**General unwinnability remains possible.** The engine permits returning and
salvaging every owned part while lost. That legal empty-inventory state passes
validation but cannot rebuild or shop until success. Even granting maximum base
power and the capped retry boost, its upper bound is
`5 * round(70 * 1.3) * 2 = 910`, below the 52,000 target. Unlimited retries do
not provide unlimited power or a new reward. This deliberately destructive
counterexample establishes a missing guarantee, not that ordinary incomplete
searches prove an inventory impossible. Starting a new workshop remains possible;
the issue is an unwinnable run, not an application/navigation deadlock. D20 asks
for a deliberate safeguard/recovery policy; none is implemented in H041.

Local ignored evidence:
- [Observed gameplay fields](../artifacts/balance/experiments/player-check-2457968940-commission-11-input.json).
- [Detached search result](../artifacts/balance/experiments/player-check-2457968940-1789166371215.json).
- [Minimal legal recovery replay](../artifacts/balance/experiments/player-check-2457968940-minimal-recovery.json).
- [Remaining campaign and general counterexample checks](../artifacts/balance/experiments/player-check-2457968940-commission-11-verified.json).

The live save still had the same timestamp, phase, score, and 96 total drops on
the post-check read. No live gameplay action, save replacement, rule edit, build,
or broad test run was performed. All simulations were detached diagnostic checks.

## Historical Reference

All following sections describe their dated pre-H040 rules and experiments,
not current production values. The structural trial was subsequently retired
when H040 adopted the combined roles/tuning redesign.

The [structural trials](#structural-trials---2026-09-11) recorded 186 legal
campaign attempts and a development-only capacity/target trial at that checkpoint.

The original sixteen-run report below remains intact. The
[2026-09-09 D09 experiment](#d09-first-experiment---2026-09-09) adds separate
diagnostic evidence; its gift-variety candidate was **not adopted**.

The [2026-09-11 progression and aiming study](#progression-and-aiming---2026-09-11)
adds 360 matched-board lane samples and 48 baseline plus 48 price-trial campaigns
with earned After Hours continuations. The price trial was also **not adopted**.
Rules and the original report were unchanged at that checkpoint; H040 above
subsequently changes normal gameplay while retaining the original evidence.

## Original Assessment

The current report demonstrates attainable progression with affordable upgrades and repeatable production physics. It does **not** establish beginner accessibility, enjoyable pacing, retention, or an appropriate selling price. Two of four beginner-policy runs stall at commission 8, while stronger automated search policies can clear many commissions in a single launch. One user playtest reported that the game feels good; this is qualitative feedback, not proof of demand or sales. Broader closed playtesting remains a product gate before charging.

Source for the original sample: [artifacts/balance/report.json](../artifacts/balance/report.json), generated **2026-09-07 at 05:38:46 UTC**, with the readable companion [artifacts/balance/report.md](../artifacts/balance/report.md). Results below describe that saved 16-run sample, not current H040 balance.

The authorized 2026-09-07 polish and four follow-ups leave scoring, prices, economy, simulation, and physical geometry unchanged. The full 16-run report is retained, not rerun for the follow-ups, and its success predictions are unchanged. **Workshop credits** is the player-facing name; internal `RunState.brass` and report accounting remain unchanged. Physical-impact audio and visual limits do not alter earned payouts.

## Progression Table

Every commission grants five launches. Targets are minimum total payouts, including banked points and collector payouts. Excess output never causes failure.

| Commission | Title | Target | Base Credit Reward | Installed Capacity |
| ---: | --- | ---: | ---: | ---: |
| 1 | Loose Change | 100 | 6 | 7 |
| 2 | Double Take | 300 | 7 | 8 |
| 3 | Branching Out | 550 | 7 | 9 |
| 4 | Good Company | 850 | 8 | 10 |
| 5 | A Little Reserve | 1,300 | 8 | 11 |
| 6 | Once More | 1,950 | 9 | 12 |
| 7 | Crown Jewel | 2,850 | 9 | 13 |
| 8 | Compound Interest | 4,200 | 10 | 14 |
| 9 | Pocket Reactor | 6,200 | 10 | 15 |
| 10 | Golden Hour | 9,000 | 11 | 16 |
| 11 | Grand Design | 13,500 | 11 | 17 |
| 12 | One Last Cascade | 20,000 | 15 | 18 |

These values are defined in [src/game/content.ts](../src/game/content.ts), with progression and economy enforced by [src/game/engine.ts](../src/game/engine.ts).

## Economy and Assistance

- **Completion reward:** base credits plus `min(3, dropsLeft)` plus `min(3, floor(max(0, score / target - 1) * 2))`. Spare-launch and overdrive bonuses each cap at +3. A 1.5x target payout earns +1 overdrive credit, 2x earns +2, and 2.5x or more earns +3. The bonus cap does not cap commission score.
- **Token power:** base values are `10, 15, 23, 35, 52, 78, 117, 175, 260`. At zero-based power level `level`, the next upgrade costs `6 + 3 * level` credits. There are eight upgrades; power is not an unbounded prestige track. It applies to all tokens, with no part to place.
- **Part prices:** Mint 3, Doubler 5, Fork 6, Kicker 4, Relay 5, Vault 5, Echo 6, Crown 8 credits. Shops offer three seeded choices, one complimentary reward, and up to two rerolls costing 2 credits each. Newly unlocked types are included when they become available.
- **Shop feedback:** the Ticket-icon wallet shows Workshop credits with earned/spent receipts. Claiming the one free gift costs nothing and removes its selector; paid stock is separate and spending is optional. Neither the guide nor receipts grant extra currency.
- **Placement:** arranging, swapping, rotating, and returning parts are free. Capacity limits installed parts, not the 46 physical sockets. The shop retains the completed commission's cap; the next space opens on advance, not purchase. A full 7/7 machine can swap or return a part, and its spares remain separately selectable above the shop. The total ownership limit is 80 installed plus spare parts. Purchases stop at that limit; the complimentary reward converts to 2 credits. Salvaging a spare grants 1 credit and clears undo history.
- **Retry commission:** a loss keeps the machine, credits, and upgrades. Retrying resets commission score and grants five launches. Base value is still `round(powerValue * (1 + min(retries, 3) * 0.1))`, so assistance tops out at +30%. The bonus resets at the next commission. The game permits further retries; the report policy stops after three retries per commission.
- **Restart level:** the new quick restart resets only the current attempt to score 0 and five launches, cancelling any live drop. It preserves earned possessions, cumulative totals, and existing difficulty/retries, adding no credits, rewards, or retry bonus. It is allowed only while ready, dropping, or lost, not during review, shopping, or victory; it cannot reopen a completed reward.
- **Relaxed:** at New Workshop creation, targets can be set to `round(normalTarget * 0.65)`. That choice and existing assisted saves retain their assistance for the run. The mid-run loss prompt and `relaxCommission` helper were removed on 2026-09-07; loss review does not automatically lower targets. The unchanged retry bonus still applies. Daily cannot start relaxed but retains normal retries.
- **After Hours:** additional commission `n`, starting at 1, targets `min(1_000_000_000, round(20_000 * 1.38 ** n))`, then applies any relaxed adjustment. Five launches, 15 base credits, and 20 installed parts continue. The first normal target is 27,600. This extends existing rules, not authored content indefinitely.

Vault banking is additional score: depositing half a token does not consume its later collector payout. Fork children add 75% of the parent's value while the parent keeps its own value. Both can amplify a route; neither should be described as value-conserving accounting.

## What the Policies Do

The names in [scripts/strategies.ts](../scripts/strategies.ts) are identifiers, not validated player-skill categories.

| Report Name | Actual Policy | Interpretation Limit |
| --- | --- | --- |
| `beginner` | Fills a fixed list of preferred sockets, uses a simple reward/purchase preference, and searches all nine lanes before and after building. | Already has better lane knowledge than an unaided beginner; not a human novice model. |
| `conservative` | Searches the best lane and brute-evaluates every available empty socket for each candidate placement; reserves at least 3 credits when buying parts. | Conservative spending, but strongly route-aware placement. Not casual or random play. |
| `optimized` | Also tries a greedy rebuild in a fixed part order and keeps it only when it improves evaluated payout. | Local greedy search, not a global optimum or exhaustive search of all builds, rotations, and purchases. |
| `splitter` | Uses the same greedy build search with Fork-oriented reward/purchase preferences. | A focused stress policy, not proof that all extreme combinations or splitter layouts are covered. |

Runs begin with untouched `newRun(seed)` state and zero credits. Purchases and transitions use the real engine; no ideal inventory, maxed power, free money, or forged settlement is injected. Candidate builds are evaluated independently of the live progression state. The harness does not model human planning, imperfect understanding, all shop tactics, relaxed assistance, or After Hours. Its route-search policies are test tools, not an in-game advisor.

## Recorded Results

Each policy was run on seeds **1, 42, 2026, and 65537**.

| Policy | Campaign Wins | Commissions Cleared | Launches per Run | Retries per Run | Best-Drop Range | Physics Seconds per Run |
| --- | ---: | --- | --- | --- | --- | --- |
| Beginner | 2 / 4 | 7, 7, 12, 12 | 24-55 | 0-5 | 696-5,954 | 85.60-178.00 |
| Route-aware conservative | 4 / 4 | 12 on every seed | 12-18 | 0 | 7,057-118,800 | 43.48-74.70 |
| Greedy optimized | 4 / 4 | 12 on every seed | 12-13 | 0 | 18,384-110,189 | 37.59-53.73 |
| Splitter-focused | 4 / 4 | 12 on every seed | 12-16 | 0 | 8,761-24,676 | 36.45-66.17 |

All 16 recorded runs stayed within four tokens per launch and recorded zero safety timeouts. That is evidence for this sample, not a universal no-timeout guarantee.

The beginner policy on **seed 1** cleared seven commissions, then reached 4,120 of commission 8's 4,200 target on its final attempt. **Seed 42** also cleared seven and ended at 3,480 of 4,200. Both exhausted the policy's three retries on commission 8; seed 42 also retried earlier commissions. These are failure signals to investigate, not successes to hide behind the stronger policies.

Late output varies widely: the route-aware conservative best-drop range exceeds an order of magnitude, and several policies clear almost the whole campaign with one launch per commission. Watch for dominant routes, redundant upgrades, and decisions that cease to matter. Do not interpret a policy called `optimized` losing to another policy as a contradiction; it is only a greedy heuristic.

## Reading the Measurements

`simulatedSeconds` sums settled gameplay-launch ticks divided by 120. The overall range is **36.45-178 seconds**, roughly 0.6-3 minutes of simulated cascade watching at 1x. It excludes candidate-search simulations, player planning, menus, shopping, and pauses. It is not wall-clock benchmark duration, human campaign length, a 20-minute promise, or evidence for an hour of content.

`totalDrops`, `totalRetries`, and `totalScore` include failed attempts. A stage's `drops` and `simulationSeconds` include its retries; its `payout` is the score of the final attempt. Stage `bestDrop` is the run's cumulative best so far, not necessarily a drop made in that stage. `maxTokens` is derived from splits plus the initial token.

## Reproduce and Retune

```powershell
npm ci
npm test -- tests/balance.test.ts
npm run test:balance
```

For a smaller diagnostic run:

```powershell
npm run test:balance -- --quick
```

The full command writes both balance artifacts for four policies across four seeds. `--quick` runs only conservative and optimized on seed 42 and **overwrites those same files**; rerun the full command before publishing a full-sample summary.

The harness exits nonzero for token-bound violations, recorded timeouts, or an unsafe total-score integer. It does **not** fail merely because a policy cannot finish. Inspect `won`, `stagesCleared`, and per-stage data even when the command exits successfully. The unit balance check covers the first three commissions and legal placement, not a universal full-campaign success criterion.

When tuning, change the smallest controlling rule in content, engine, or simulation; rerun focused tests, then regenerate the full sample. Preserve failing seeds and compare completion, retries, output variance, and purchase choices. Evaluate hypothetical purchases on detached state so affordability and rewards cannot be contaminated. Do not make an artificially maxed fixture dictate production economy or bypass actual launches to force a green test.

Expand seed coverage and add poor-route, recovery, and After Hours samples before treating the table as representative. Keep value/timeout safety separate from difficulty tuning: the 1e12 token-value cap and 12-second collector settlement are runtime bounds, not balancing tools for ordinary commissions.

## Human Playtest Gate

### Historical Recovery Probe

A separate four-seed probe with relaxed targets and the same beginner policy finished seeds 1 and 65537, but still stalled on seeds 42 and 2026 at commission 10. This probe does not replace the saved full 16-run report. Easier targets alone are not evidence of novice accessibility.

After these results, optional **Inspect my machine** advice was added after a loss. It evaluated a lane change or owned-part move/swap with the production simulator, showed before/after payout, and applied only the selected legal edit. It ran on a local worker and granted no points, currency, parts, or launches. Checks at the time demonstrated an improvement on the tested machine, not a guarantee for every layout.

The calculated advisor, its UI, and unit test were **removed on 2026-09-07 by user decision**. Neither the saved report nor the relaxed probe used it; those measurements remain historical evidence, not claims about an available feature. The replacement Quick Guide teaches place/launch/collect/gift/spend with optional skip/replay and actionable highlights, never route suggestions, automatic solutions, or extra currency. That removal did not retune assistance; the later approved loss-flow change removed the mid-run relaxed choice, not the retry bonus or initial Workshop option.

Observe players without supplying the best lane or a solved layout. Record whether they can explain a useful edit, notice a new part's effect, recover from a loss, and finish the early loop without coaching. Pay particular attention to commission 8, the distinction between Restart level and Retry commission, the initial New Workshop relaxed option, late-game repetition, and readable high-output results. Test keyboard/controller navigation, color/contrast and motion settings, and physical audio levels as part of that experience.

Measure real planning time, actual session duration, voluntary replay, and perceived value. The research price is provisional; this sample supplies no sales estimate or fair-price validation. Release decisions should combine these observations with [docs/RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md), not extrapolate from automated win counts.

[docs/OPEN-ITEMS.md](OPEN-ITEMS.md) is the authoritative work tracker. P14 verification and delivery are complete in [docs/VERIFICATION.md](VERIFICATION.md); this retained balance sample remains distinct from those regression results. The 2026-09-08 user report and read-only save evidence about overly permissive late-game growth are recorded in [HISTORY.md](HISTORY.md#h010---2026-09-08---duplicate-stacks-late-game-ease-and-this-history), with retuning open under D09. No balance values changed during that discussion.

## D09 First Experiment - 2026-09-09

**Decision: keep normal gameplay unchanged.** The user approved diagnosis and an
isolated later-free-gift experiment, not all of the earlier balancing suggestions.
The trial did not demonstrate better progression or worthwhile later decisions.
No further tuning or broader design change was automatically substituted.

### Method and Boundaries

[balance-diagnostics.ts](../scripts/balance-diagnostics.ts) uses the existing
campaign runner and production physics with optional test-only policies and
detached observation snapshots. Eight seeds were fixed before comparison:
1, 42, 2026, 65537, 7, 13, 99, and 2027. Eleven policies produced **88 baseline
and 88 candidate campaigns**. All acquisitions use actual rewards and legal
purchases; the ordinary player save is never read or replaced.

The [gift candidate](../scripts/experiments/gift-variety.ts) preserves the first
six shops. After commissions 7-11, a separate deterministic 25% gate can replace
only the third free choice with an unlocked, not-already-offered kind owned in
fewer copies, counting installed and spare parts. Two original choices remain.
Prices, scoring, physics, launch budget, power, capacity, previously saved choices,
final rewards, and After Hours are unchanged. This function is not wired into
the normal engine, renderer, or packaged game.

The limited-edit policy accepts at most two improving edits per build from at
most twelve candidates each: adjacent lanes and placements of up to two spare or
unhit parts near observed contacts. It does not comprehensively search rotations,
swap useful installed parts, or model human reasoning. It knows simulated outcomes,
so it is not a measured novice. The parts-first variant buys available stock before
power without sophisticated purchase valuation. The recovery variant uses these
limited edits only after a loss. Retry sampling stops after three per commission.

Frozen-after-six policies use the optimized builder through commission 6, then
stop all layout/lane changes. One claims required gifts but buys nothing further;
the other buys affordable power. Later uninstalled gifts have no scoring effect.

### Measured Results

| Policy | Baseline Wins | Candidate Wins | Important Observation |
| --- | ---: | ---: | --- |
| Simple fixed-placement policy | 2/8 | 2/8 | Cleared 7, 7, 12, 12, 8, 8, 8, 4 commissions on the ordered seeds. |
| Route-aware conservative | 8/8 | 8/8 | No campaign record changed. |
| Greedy optimized | 8/8 | 8/8 | No campaign record changed. |
| Splitter-focused | 8/8 | 8/8 | Seed 1 needed 16 rather than 15 launches; best drop fell from 9,276 to 8,043. |
| Untouched starting layout, no purchases | 0/8 | 0/8 | All stopped at commission 2. |
| Untouched starting layout, power only | 0/8 | 0/8 | All stopped at commission 2; power alone does not replace learning a route. |
| Limited edits, power-first shopping | 0/8 | 0/8 | Six reached commission 12 and two commission 11 before stalling. |
| Limited edits, stock-first shopping | 0/8 | 0/8 | Cleared 4-6 commissions; this crude shopping policy is not an informed player. |
| Simple policy with limited loss recovery | 2/8 | 2/8 | No gift-candidate benefit; recovery itself improved seed 2027 from 4 to 6 cleared, still a stall. |
| Frozen after commission 6, no further purchases | 8/8 | 8/8 | Established strong machines finished without further layout or power changes. |
| Frozen after commission 6, power purchases only | 8/8 | 8/8 | Additional power was not required for completion in these samples. |

Across the paired runs, **33 offer sets and 17 selected gifts changed**. All
completion results stayed the same; **87/88 full campaign records were identical**.
The remaining splitter run had a lower best payout and one extra launch. The
first 529 reached stage records through commission 7 matched exactly, as did
the first six shops. No new stalls, timeouts, token-bound violations, or unsafe
score integers were found. Later improving first-attempt builds did not increase:
the splitter policy fell from 13 to 12; the other policies were unchanged.

This does not prove gift variety can never be useful. It does show this small
late candidate failed the agreed reason to adopt it: it neither improved recovery
nor sustained more useful edits, and its only changed campaign added repetition.
Do not strengthen the bias, alter earlier shops, weaken power, or raise targets
without a separately justified and approved next experiment.

### Experience and Evidence

Two [browser cases](../tests/browser/gift-variety.spec.ts) exercise 1440px desktop
and 390px mobile layouts using a seventh-shop fixture earned from a fresh seed-42
run through real rules and affordable actions. They check three visible choices,
unchanged choices after reload, zero credit cost for the gift, installation after
capacity opens, a changing painted canvas, exact simulated payout after an actual
UI launch, and persistence after another reload. This is an earned simulation
fixture followed by real UI actions, not seven commissions played manually.

The inspected Echo placement raises the payout from **4,648 to 4,721**. The next
target is already **4,200**, so this functional improvement alone is not evidence
of a better decision or more satisfying progression. Screenshots were visually
inspected; no physical speaker/controller testing or human enjoyment claim follows.
The existing full-campaign browser test remains separate from these fixture cases.

Raw evidence:
- [Baseline diagnostics](../artifacts/balance/experiments/baseline-2026-09-09.json).
- [Candidate diagnostics](../artifacts/balance/experiments/gift-variety-1788977576927.json).
- [Matched comparison and non-adoption decision](../artifacts/balance/experiments/comparison-2026-09-09.json).

All original sixteen campaign records were reproduced exactly. A hash check also
confirmed that all 40 original runtime/native, manifest/lockfile, and baseline
files remain unchanged. D09 remains open: investigate the timing of machine
completion and later worthwhile decisions while protecting ordinary recovery.
Neither defeating an oracle policy nor forcing extra identical launches is the goal.

## Progression and Aiming - 2026-09-11

H034 authorizes D09/D14/D15 together with reward/content clarity. The decision
after this pass is **no production price, target, multiplier, or completion-rule
change**. The new reward dialog and factual payout receipt do not rebalance play.

### Matched Earned Boards

[aiming-study.ts](../scripts/aiming-study.ts) replays the first-attempt boards from
the existing eight-seed baseline for four policies. It evaluates all nine lanes
with [aiming-analysis.ts](../scripts/aiming-analysis.ts), reproduces every recorded
current-lane payout exactly, and checks token/time bounds. These are **360 earned
board snapshots**, not 360 fresh campaigns or a model of unaided human aiming.

| Policy | Boards | Centered Lane Can Clear | Best Lane Can Clear | Aim Rescues | Best Route Skips Center |
| --- | ---: | ---: | ---: | ---: | ---: |
| Beginner | 72 | 33 | 60 | 27 | 8 |
| Conservative | 96 | 34 | 96 | 62 | 12 |
| Optimized | 96 | 27 | 96 | 69 | 0 |
| Splitter | 96 | 24 | 96 | 72 | 0 |

"Can clear" means five identical drops reach that board's current target, without
retry assistance or more purchases/edits. Aiming rescues **230 of 242** snapshots
that would miss if simply recentered. Every sampled board has a center-reaching
lane; 20 highest-paying routes nevertheless skip the center. These boards were
built by lane-searching policies, so recentering them is deliberately a matched
counterfactual, not evidence that all players must aim on every commission.

Center arrivals and the **extra x2 bonus** are different questions. On the actual
recorded routes, removing the whole center payout changes five-drop completion
on 99 snapshots. Replacing x2 with x1 for those same collected tokens changes it
on only **16**: 0 of 96 opening boards, 9 of 95 middle boards, and 7 of 169 late
boards. This calculation is `total - centerPayout / 2`; the sample was checked
for even center totals and values below the numeric cap. It does not reroute the
tokens or remove their ordinary x1 value. Center arrivals occur on 90, 88, and
162 boards in those three groups respectively, so they are not confined to the
late campaign in these policies. This does not reconstruct the user's private
play or settle what they meant by "the very end."

### Full Legal Progression

[progression-study.ts](../scripts/progression-study.ts) runs six policies on seeds
**1, 42, 2026, 65537, 7, 13, 99, 2027**. There are 48 baseline and 48 candidate
campaigns, then up to five actual earned After Hours commissions for winners.
Each commission is sampled through at most three retries; the game itself allows
further retries. No artificial money, perfect inventory, or forged drop result
is supplied. All 40 overlapping default/frozen campaign records reproduce the
archived baseline exactly; the eight fixed-center campaigns are new comparisons.

The fixed-center policy searches placements **at lane 5 throughout building**, not
by finding an ideal lane and resetting it afterward. Frozen-after-six uses the
optimized builder through commission 6, then stops all layout/lane edits and
paid purchases, while still claiming required gifts into the unused bench.

| Policy | Campaign Wins, Baseline / Trial | Campaign Launches, Baseline / Trial | After Hours Cleared, Baseline / Trial |
| --- | --- | ---: | ---: |
| Beginner | 2/8 / 2/8 | 378 / 373 | 3 / 2 |
| Conservative | 8/8 / 8/8 | 105 / 105 | 38 / 40 |
| Optimized | 8/8 / 8/8 | 99 / 100 | 40 / 39 |
| Splitter | 8/8 / 8/8 | 118 / 123 | 35 / 31 |
| Frozen after six | 8/8 / 8/8 | 106 / 106 | 34 / 34 |
| Fixed center | 8/8 / 8/8 | 113 / 114 | 35 / 31 |

Launch counts are totals across eight campaigns and include losing attempts.
After Hours totals are cleared commissions, at most five per campaign winner;
an unfinished campaign has no continuation. Fewer launches after an earlier
stall are not an improvement. All sampled launches/continuations stayed within
four tokens, safe integer scores, and zero recorded timeouts.

### Price Trial Decision

The isolated [repeat-price candidate](../scripts/experiments/repeat-prices.ts)
keeps the first three shops unchanged. From the fourth shop, paid Doublers and
Crowns cost +2 when three copies are already owned and at most +4 when four or
more are owned, counting installed and spare parts. Prices are captured on
collection before the free gift. Gifts, effects, quotas, physics, and power are
unchanged. This is a diagnostic collect hook, **not a live pricing or reroll API**.

[compare-progression.ts](../scripts/compare-progression.ts) verifies all 48 pairs:
the first four commission records and first three shops match. Only 15 complete
campaign records remain identical; changed currency alone also makes a record
different. Campaign win counts hide the important regressions:

- Beginner seed 1 falls from seven to six cleared commissions; its best drop
	falls from 824 to 540. Its five fewer launches come from stopping earlier.
- Eight matched continuations clear fewer After Hours commissions: beginner
	2026, optimized 13, splitter 1/13/99/2027, and fixed-center 2026/2027.
- Conservative seed 42 improves from three to five After Hours clears, and some
	strong payouts increase. Those gains do not erase the weaker-run regressions.
- Frozen-after-six still wins 8/8 without new layout or power purchases. Later
	improving first-attempt builds rise only from 19 to 20 for optimized play;
	other policy totals stay unchanged. No route-aware later build crosses from
	unable to able to meet the five-drop target. The before-build state includes
	prior shopping, so this is not proof about every possible isolated move.

**Reject the trial.** It does not solve late decision-making, and it worsens
matched recovery/continuation. No threshold chasing, combined gift bias, power
nerf, harder quota, or mandatory center hit was substituted. Large earned payouts
remain valid successes. D09 and D14 stay open: useful late decisions still need
design work, rather than a tax that merely changes purchases or adds repetition.

### Evidence and Reproduction

- [Aiming snapshots and per-lane results](../artifacts/balance/experiments/aiming-1789068715035.json).
- [48 baseline campaigns and continuations](../artifacts/balance/experiments/progression-baseline-1789070868297.json).
- [48 repeat-price campaigns and continuations](../artifacts/balance/experiments/progression-repeat-prices-1789071173837.json).
- [Paired checks and rejection record](../artifacts/balance/experiments/progression-comparison-1789071477949.json).

Experiment outputs are local ignored artifacts, not the original published
sixteen-run reference. On a fresh checkout, first regenerate the missing archived
input with `node --import tsx scripts/balance-diagnostics.ts baseline-2026-09-09.json`.
That command refuses to overwrite an existing file. Then run:

```powershell
node --import tsx scripts/aiming-study.ts
node --import tsx scripts/progression-study.ts
node --import tsx scripts/progression-study.ts --candidate
node --import tsx scripts/compare-progression.ts <baseline-output-path> <candidate-output-path>
```

Use the unique paths printed by the progression commands. These are full,
potentially lengthy searches; do not replace them with `test:balance --quick`,
which writes over the unrelated original report. Rule/UI tests verify correctness
and observed feedback, not enjoyment or necessary human repositioning. No in-game
solver, extra center requirement, split-limit expansion, or D01 endgame work was
introduced.

## Structural Trials - 2026-09-11

H037 authorizes testing the three H035 suggestions. **Keep slower installation
growth plus calibrated targets as a playable candidate, not a normal-rule
replacement yet.** It creates recoverable building pressure in the sampled
simple builds, but does not establish universally meaningful late decisions.

### Candidates and Method

[balance-trial.ts](../src/game/balance-trial.ts) defines fixed candidates:

- **Space:** capacities 7, 8, 9, 9, 9, 9, 10, 10, 10, 11, 11, 11; 11 in the
	sampled After Hours. Bench ownership and free swapping/removal are unchanged.
- **Sockets:** fixed sockets 3-0, 3-5, and 5-2 double token value immediately
	before their equipped part's effect, once per token under the usual visited
	rules. Empty sockets grant nothing. The shared simulator, not a scoring clone,
	applies this explicit option. Geometry and launch conditions do not change.
- **Checkpoints:** commission 6 permits 7 installed parts, commission 9 permits
	8, and commission 12 permits 9; other commissions retain normal capacity.
	Best-payout removals to fit are recorded separately, not called useful edits.
- **Pressure:** a single steeper fixed target curve, selected after the initial
	two-seed screen. It preserves the first three targets and rises roughly 1.8x
	per later commission. Tested alone, with space, with space/sockets, and with
	checkpoints. It never reacts to a player's output during a run.

The initial screen ran five variants and four policies on seeds 1/42 (40 runs).
The calibrated screen ran four variants and five policies on those seeds (40).
Baseline, space/pressure, and space/sockets/pressure then ran on the other six
fixed seeds 2026, 65537, 7, 13, 99, 2027 with four policies (72). Two missing
baseline recovery controls were replayed, giving 154. A separate 32-run
conservative/Fork-shopping check brings the total to **186 campaign attempts**,
not 186 wins. Winners continue through at most three earned After Hours stages;
each stage permits up to three retries in the harness, not unlimited recovery.

The [runner](../scripts/structural-study.ts) starts fresh with real owned parts,
earned shops, and actual settled drops. It records passive-peg contacts from
the previous launch to construct an observed route. The trail policy only adds
spares to empty contacted sockets, at fixed center aim. It evaluates all those
placements and keeps improving ones, so it is a strong outcome-aware version of
trail filling, not a human novice. All primary comparisons use identical
optimized purchase preferences and one affordable power upgrade per shop.

Recovery follows that same policy until the current machine cannot meet the
target with its remaining launches, then tries up to three improving decisions
per build. Candidates include lane changes, up to twelve observed/nearby
destinations, spare replacements, selected installed moves/swaps, and directional
rotation. A placement plus rotation is two atomic actions in one candidate.
"Local" makes those improvements proactively; "rebuild" also tries the existing
greedy full rebuild; "frozen" builds strongly through commission 6, then stops
all layout/lane changes and purchases. Required gifts remain unused on its bench.
The diagnostic search is not available as an in-game advisor.

### Preferred Playable Trial

| Commission | Target | Installed Capacity |
| ---: | ---: | ---: |
| 1 | 100 | 7 |
| 2 | 300 | 8 |
| 3 | 550 | 9 |
| 4 | 1,000 | 9 |
| 5 | 1,800 | 9 |
| 6 | 3,200 | 9 |
| 7 | 5,800 | 10 |
| 8 | 10,400 | 10 |
| 9 | 18,700 | 10 |
| 10 | 33,700 | 11 |
| 11 | 60,600 | 11 |
| 12 | 109,100 | 11 |

After Hours uses `min(1e9, round(109100 * 1.38 ** n))`, starting at n=1, and
keeps capacity 11. Normal prices, token power, gifts, rewards, five launches,
retry help, deterministic physics, and excess-as-success are retained. Reward
overdrive and achievement thresholds use the actual trial target. There are
no bonus sockets, compulsory center hits, or special checkpoints in this trial.

Across the same eight seeds:

| Policy | Normal Wins | Trial Wins | Normal / Trial Campaign Launches | Normal / Trial Late Repositioning Rescues |
| --- | ---: | ---: | ---: | ---: |
| Trail filling | 7/8 | 3/8 | 139 / 295 | 0 / 0 |
| Trail filling with recovery | 8/8 | 8/8 | 121 / 190 | 1 / 6 |
| Proactive local improvements | 8/8 | 8/8 | 104 / 104 | 0 / 0 |
| Strong build frozen after six | 8/8 | 7/8 | 97 / 182 | 0 / 0 |

Launches include failed attempts. Late rescues cover commissions 7-12 only:
an edit changes the owned board so current score plus the remaining launches'
payout crosses the target. They are not counts of all moves or evidence that
every action in a three-decision plan is independently necessary. Recovery play
clears all 24 sampled After Hours commissions under both rules. Trial frozen
machines clear only 8 of 24, but **7/8 still finish the campaign**. Deliberate
early building can still make the campaign easy.

Example, seed 42 commission 9: five unchanged drops at **3,428** fall short of
**18,700**. Replacing three owned parts with an owned Crown, Doubler, and Echo
raises the drop to **11,584**, without spending the remaining one credit or
changing power. The full browser test performs these real controls and completes
the campaign with a 47,672 best drop. This example is mainly better value ordering
on the existing route, not proof of a more interesting physical detour.

All **32 alternate-shopping runs** using conservative or Fork-focused preferences
with recovery/proactive-local building win and clear their three continuations.
Recovery produces seven and eight late repositioning rescues respectively. That
supports viability beyond one shopping preference, not a proof of distinct,
equally satisfying build archetypes or freedom from dominant multiplier chains.

### What Was Not Selected

Space alone still wins both screening trail campaigns and mainly adds launches.
Targets alone also leave those trail campaigns winning. Fixed bonuses can simply
strengthen easy routes: adding them to the preferred candidate lifts trail wins
from 3/8 to 6/8 and reduces late recovery rescues from six to two. Compact
checkpoints require 29 removals across the two screening trail runs without
creating a late scoring rescue. These particular implementations were not
selected for player testing; that does not disprove every bonus or checkpoint
design. No parameter search was continued just to force stronger policies to lose.

### Evidence, Limits, and Reproduction

The [summary](../artifacts/balance/experiments/structural-summary-1789076205645.json)
checks 70 protected-opening comparisons and independently re-simulates 21 saved
recovery pairs, verifying owned IDs, unchanged credits/power, exact payouts, and
the before/after completion threshold. All sampled campaigns/continuations report
zero timeouts and stay within four tokens and safe integer scores. The initial
screen predates the explicit repositioned-field measurement; its no-rescue
results are still recorded, not silently reconstructed as human behavior.

- [Initial 40-run screen](../artifacts/balance/experiments/structural-1789074237005.json).
- [40-run calibrated screen](../artifacts/balance/experiments/structural-1789074748141.json).
- [72 additional-seed runs](../artifacts/balance/experiments/structural-1789075039490.json).
- [32 alternate-shopping runs](../artifacts/balance/experiments/structural-variety-1789076767193.json).
- The original unsaved-trial UI test was retired in H040; its
	[successor campaign regression](../tests/browser/campaign.spec.ts) covers
	the new normal rules and saved progression, not the historical trial.

The fixed seed set is small, the planners know simulated outcomes, and some
scoring gains still come from straightforward part upgrades on the same trail.
This is progress against automatic add-and-win play, not proof of human fun,
universal late repositioning, or solved D09/D14. Further adoption should be based
on trying this concrete candidate, not conflating passing correctness tests with
an ideal difficulty curve.

```powershell
node --import tsx scripts/structural-study.ts --variants=baseline,space,sockets,space-sockets,checkpoints --policies=trail,local,rebuild,frozen --seeds=1,42 --continuation=3
node --import tsx scripts/structural-study.ts --variants=pressure,space-pressure,space-sockets-pressure,checkpoints-pressure --seeds=1,42 --continuation=3
node --import tsx scripts/structural-study.ts --variants=baseline,space-pressure,space-sockets-pressure --policies=trail,recovery,local,frozen --seeds=2026,65537,7,13,99,2027 --continuation=3
node --import tsx scripts/summarize-structural.ts <screen-json> <calibration-json> <additional-seeds-json>
node --import tsx scripts/structural-build-variety.ts
```

Use the generated unique JSON paths. No archived input is required for these
structural scripts, and they do not overwrite the original balance reports.
The Play task serves the temporary candidate at
http://127.0.0.1:5173/?balanceTrial=space-pressure&seed=42. It is **not saved**:
reload starts again, import/export are disabled, and normal storage is untouched.
The flag is inactive in production builds and native Electron. This is an
experiment entry, not a permanent old/new balance profile or save migration.

## First Structural Playtest - 2026-09-12

H039 adds direct feedback from the user playing the candidate: commissions 1-9
required very few changes while favoring free Doublers and Crowns. Commissions
10-12 required some thought, but the user attributes it mainly to earlier random
buying, not interesting new machine requirements. This is a human observation,
not a new automated campaign result or a reconstructed purchase history.

Read-only inspection of the active seed-42 trial found After Hours 4, 11/11 parts,
max power (260 base value), and an 85,375-point last cascade with four tokens.
The board has five Doublers, two Crowns, two Echoes, and two Forks. All three Mints
are on the bench, with surplus Echo/Crown rewards; no Vault is installed and the
last drop banks zero. The user continued playing during inspection: the first
read had 73 total launches, 47 credits, and two launches left; a later read had
75 total launches, 62 credits, and the completed shop at 426,875 points. The
assistant did not launch, reload, change, or replace that machine. This is live
in-memory state; the trial deliberately has no persistent save. Earlier stage
layouts and purchase choices cannot be inferred from this end-state alone.

The trial keeps 11 slots in After Hours; normal play goes from 18 to 20 and then
stays at 20. That experimental restriction tested replacement pressure, not a
complete continuation reward design. Capacity is not automatically a reason
to stop gifting parts, but gifts need valuable replacement/upgrade possibilities.
Repeated near-identical parts and more credits lose purpose once power and the
useful build are full. Simply adding unlimited slots would mostly amplify the
same dominant combinations.

Current-effect comparison supports reviewing part roles before more quota work:
at base 260, Mint adds 364. On an already 10,000-value token this is only 3.64%,
while Doubler adds 10,000. An early Mint can still be valuable before downstream
multipliers; this does not mean Mint is globally useless. Vault banks 50% without
consuming value, but with no uncollected-token loss its supposed safety role is
weak. For a simple final hit with no later synergies, Doubler adds more collector
payout than Vault's half-value deposit; distinct-kind/Crown interactions and
placement can change particular comparisons. Do not call Vault universally
dominated without accounting for those relationships.

**Recommendation, not selected mechanics:** develop useful generator/banking/
routing relationships and earned upgrades or transformations of installed parts.
Duplicates could contribute to a targeted upgrade instead of only an unused
bench copy. Add a few new parts only if they create different decisions, such as
a payoff for bringing split branches together or a finisher powered by deposits.
Consider bounded After Hours capacity milestones and rewards/goals alongside
that work, not as an automatic board expansion. Aim for meaningful choices before
commission 10, while preserving big earned cascades and a readable opening.

No part effects, gifts, capacities, target values, power, or After Hours rules
changed in H039. The implemented change is feedback performance only. D09/D14
remain unresolved; the trial should not become the default based solely on its
automated completion/recovery table. D18 tracks the new discussion scope.