# Pocket Cascade Balance

The original sixteen-run report below remains intact. The
[2026-09-09 D09 experiment](#d09-first-experiment---2026-09-09) adds separate
diagnostic evidence; its gift-variety candidate was **not adopted**.

## Current Assessment

The current report demonstrates attainable progression with affordable upgrades and repeatable production physics. It does **not** establish beginner accessibility, enjoyable pacing, retention, or an appropriate selling price. Two of four beginner-policy runs stall at commission 8, while stronger automated search policies can clear many commissions in a single launch. One user playtest reported that the game feels good; this is qualitative feedback, not proof of demand or sales. Broader closed playtesting remains a product gate before charging.

Source of truth: [artifacts/balance/report.json](../artifacts/balance/report.json), generated **2026-09-07 at 05:38:46 UTC**, with the readable companion [artifacts/balance/report.md](../artifacts/balance/report.md). Results below describe that saved 16-run sample, not every possible seed or unrecorded later edits.

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