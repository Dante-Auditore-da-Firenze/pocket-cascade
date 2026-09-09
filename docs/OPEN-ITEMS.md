# Open Items and Decisions

Updated: 2026-09-10. This is the working decision and implementation tracker.
An item is resolved only when its agreed outcome is implemented and checked, or
when an explicit decision closes it without implementation. Retain the outcome
and evidence so decisions are not lost.

[HISTORY.md](HISTORY.md) preserves the chronological conversation, reasoning,
approvals, reversals, and observations. Append there after each substantive chat;
keep this file focused on current work status.

## Restored Workspace

| ID | Item | Status | Outcome / Follow-up |
| --- | --- | --- | --- |
| R01 | Verify the text-handoff restore end to end | Resolved | Verified 2026-09-08 on the restored Windows workspace: all 139 transferred files matched, 7 handoff tests, production build, 246 unit tests, 60 browser tests, 12 native tests, and both rebuilt Windows launchers passed. A separate full 16-run balance report exactly reproduces the original; original reports, lockfile, and implementation remain unchanged. Node/npm, Chromium, and Electron are installed. The game is running at http://127.0.0.1:5173/. No pre-existing native player save was present; packaged checks initialized a fresh version-1 save. See HISTORY.md H017 and VERIFICATION.md. |
| R02 | Refresh the existing VS Code task environment | Resolved | Rechecked 2026-09-09: the task could find Node/npm, but PowerShell blocked npm.ps1 under the existing execution policy. Added a Windows-only npm.cmd override to the portable Play task, without changing system policy or hardcoding an installation path. The ordinary Pocket Cascade: Play task now starts this game at http://127.0.0.1:5173/. Focused test tasks also launch Node successfully. See HISTORY.md H019. |
| R03 | Initialize local Git with repository exclusions | Resolved | Explicitly authorized 2026-09-10. Initialized the local repository with initial branch main; no files staged, commits created, or remote configured. Added .gitignore exclusions for dependencies, builds, generated artifacts, handoff bundles, likely credential/key files, local settings, and player saves; retained source, manifests/lockfile, original assets, tasks, and the original balance reference. Thirty exclusion and thirteen required-file checks passed. Gitleaks scanned all 142 eligible files with no remaining findings after narrowly allowing two public storage identifiers; a synthetic-token probe confirms default detection remains active. This is a local scan, not automatic future-commit enforcement. See HISTORY.md H021. |
| R04 | Commit and publish to origin | Resolved | Created https://github.com/Dante-Auditore-da-Firenze/pocket-cascade and published `Initial commit` (8cc531d). The user explicitly approved public visibility after GitHub rejected private-repository rules under the current plan. All 145 staged files passed Gitleaks scanning, ignored files remained excluded, and GitHub's main hash matched the local commit. main tracks origin/main; commit identity uses the GitHub noreply address. See HISTORY.md H024. |
| R05 | Require owner approval for main, with temporary owner bypass | Resolved | GitHub reports main protected; the published all-files CODEOWNERS entry has zero errors. The active PR rule requires one code-owner approval and dismisses stale approvals, with only Dante-Auditore-da-Firenze (ID 73032811) permitted to bypass it for direct pushes/merges, as requested for now. The separate active history rule blocks force pushes and deletion with no bypass, including for the owner. Exact server rules and bypass permissions were read back; the owner push succeeded. Future removal of the owner exception requires a separate decision. See HISTORY.md H024. |

## Current Polish Pass

| ID | Item | Status | Agreed Outcome / Evidence |
| --- | --- | --- | --- |
| P01 | More prominent impact sounds | Resolved | Physical peg/wall contacts and stronger distinct part/collector feedback implemented. Separate ephemeral contact channel preserves scoring traces. Unit and production PCM tests at 44.1/48 kHz pass, including burst headroom, mute, voice limits, and real contact forwarding. Physical speaker comfort remains a human check. |
| P02 | Music continues in menus | Resolved | Same music clock continues at 80% of the chosen music gain while paused/in menus. Unit scheduling and real menu-open/close browser tests pass; no track restart. Dedicated compositions remain deferred. |
| P03 | Playable first-run tutorial | Resolved | Implemented a nonblocking action-driven guide with skip/replay and save-compatible progress. No prescribed placement or mandatory purchase. Five unit cases and four onboarding E2E cases pass. |
| P04 | Points, launches, and currency clarity | Resolved | Workshop credits replace brass in player-facing text. Labeled ticket-icon wallet, earned/spent receipts, commission points, one free gift, and paid stock are separated. Onboarding E2E verifies no free-gift charge and exact purchase deduction; internal economy/save fields are unchanged. |
| P05 | Remove machine suggestions | Resolved | Removed the calculated advisor, worker, and UI. Part descriptions, observed trails, free manual rewiring, and tutorial remain. Browser/native loss tests verify advisor absence and retained ownership/manual edits. |
| P06 | Use available screen space | Resolved | Height-aware cabinet sizing with adjacent bounded panels; same logical board. 18 layout tests pass from 320px mobile to 3440px ultrawide, including guide states, visible canvas repaint, and non-overlapping controls. Representative desktop/mobile screenshots inspected. Theme/board expansion unchanged. |
| P07 | Borderless fullscreen startup | Resolved | Initial fresh-save fullscreen default, native bounds, frame restoration, and display controls were verified. Older saves retained the previous windowed default; P10 resolves that follow-up with a one-time migration. |
| P08 | Reduced-motion setting | Resolved | Moved into Accessibility options and kept off by default, including when the OS requests reduced motion. Explicit saved choices are preserved. Unit/save and browser opt-in/reload regressions pass. |
| P09 | Regression and delivered builds | Resolved | Production build, 221 unit tests, 47 browser E2E tests, and 10 native tests pass. Rebuilt portable/unpacked Windows executables both pass actual-launch smoke tests. Gameplay captures refreshed; current hashes and evidence are in VERIFICATION.md and artifacts/release/verification.json. |

## Follow-up Usability Pass

| ID | Item | Status | Agreed Outcome / Evidence |
| --- | --- | --- | --- |
| P10 | Fullscreen for existing installations | Resolved | Unmarked desktop preferences migrate once to fullscreen using fullscreenPreferenceVersion. Native relaunch test confirms the machine, currency, and other preferences stay intact and a later windowed choice is remembered. Browser-only saves are not forced into fullscreen. |
| P11 | Restart level and New Workshop controls | Resolved | Toolbar/menu restart clears an unfinished attempt, restores five launches, and retains possessions, totals, and difficulty without a new retry bonus. Completed phases reject restart. New Workshop opens the existing confirmation/seed dialog. Engine and actual-play restart/cancel/reload tests pass. |
| P12 | Remove mid-run relaxed-target prompt | Resolved | Removed the loss-screen prompt and helper. New Workshop's optional relaxed difficulty and existing retry/save behavior are retained. Browser loss test confirms no mid-run prompt and same-difficulty restart. |
| P13 | Spare inventory and installation capacity | Resolved | Spare inventory stays visible above the shop. Board toolbar shows installed/free capacity; full-state notice explains swaps and the next level's extra space. Real-purchase E2E checks place both gift and purchased parts and retain extra inventory at capacity. All 18 layout checks pass after reserving toolbar space. |
| P14 | Follow-up regression and delivered builds | Resolved | Production build, 238 unit tests, 52 browser tests, and 11 native tests pass. Portable and unpacked Windows builds were rebuilt and both actual executables pass smoke tests. The local save migrated to fullscreen while retaining its commission, installed parts, and credits. Gameplay captures and verification hashes refreshed. |

## Spare-Icon Follow-up

| ID | Item | Status | Agreed Outcome / Evidence |
| --- | --- | --- | --- |
| D08 | Stack identical spare parts in the inventory | Resolved | Approved and completed 2026-09-08. Equivalent spares share one icon with a separate quantity badge; left/right Forks and Kickers remain distinct. Individual IDs, selection, ownership, and version-1 saves are retained. Eight grouping unit cases and eight dedicated browser cases pass, including one-copy actions and quantity/effect separation. Full verification: 246 unit, 60 browser, 12 native tests; both rebuilt Windows executables launched successfully. Native earned-duplicate relaunch/placement passes, and the ordinary player's run/profile/settings fingerprint is unchanged across packaged launches. No scoring, price, capacity, or balance changes. See HISTORY.md H011 and VERIFICATION.md. |

## Deferred: No Implementation Yet

| ID | Item | Status | Question / Boundary |
| --- | --- | --- | --- |
| D01 | Endgame and much greater cascade chaos | Open: deferred | Reconsider progression, performance, sound density, and accounting before allowing hundreds/thousands of balls. No split-limit or endgame-economy change now. |
| D02 | Larger machine after the campaign | Open: deferred | Decide how board expansion is earned, preserves the existing machine, and supports zoom/pan. No board-geometry changes now. |
| D03 | Theme, background, and remaining side space | Open: undecided | P06 enlarged the cabinet and tightened the side panels; that layout improvement is complete. The remaining empty space on the left/right still needs a visual composition decision tied to the background/theme. An inventor workshop was recommended, not selected. Compare it with alternatives before committing to environment/character art; do not fill the margins with unrelated panels or implement a theme yet. |
| D04 | Steam autosave / Cloud requirements | Open: investigate later | Determine whether existing native autosaves plus Steam Auto-Cloud configuration are sufficient, including account scope, conflicts, offline/reconnect, and migration. No Steam/save-architecture changes now. |
| D05 | Dedicated menu/gameplay music | Open: deferred | Evaluate separate compositions or transitions later. Current decision is continuous existing music. |
| D06 | Named workshop save slots | Open: deferred | Decide how players save and load multiple named machines. Current autosave/export remains; no save-slot UI or storage redesign in this pass. |
| D07 | Playback-speed control visibility | Open: review | Player-facing 1x, 2x, and 4x controls already exist beside Drop Token, below Pause; testing uses these same controls, not a hidden speed cheat. Fresh saves start at 1x and the chosen speed is saved. Speed changes playback time while retaining fixed-step physics and scoring. Review whether the controls need clearer placement or emphasis so players notice them. No new speed modes or UI changes authorized yet. |
| D09 | Late-game growth and meaningful difficulty | Open: first experiment evaluated, not adopted | Approved 2026-09-09: diagnosis and one isolated later-gift variety trial, with tests and actual UI checks. Completed 88 baseline plus 88 candidate legal campaigns. The trial changed 33 offers and 17 picks, but 87/88 campaign records were identical and the remaining run needed one extra launch with a lower best payout. No completion/recovery benefit or increase in later improving edits. Kept the candidate test-only; normal gameplay is unchanged. Ten focused unit checks and two desktop/mobile reward-flow checks pass. The broader balance problem remains open; prices, effects, targets, power, saves, theme, and endgame changes are not approved by this experiment. See HISTORY.md H019 and BALANCE.md. |
| D10 | Post-level part-selection visibility | Open: deferred | User reports the part-selection menu after each level is too easy to miss. Explore a prominent dialog presenting 3-4 part choices, similar to roguelite reward selection. Dialog timing, dismissal/reopening, and the exact option count remain undecided. Keep the free reward distinct from paid shop stock; changing the offered choice count requires a separate decision. No UI, reward, balance, or save changes approved. See HISTORY.md H014. |
| D11 | Low-zoom cabinet/text scaling and control overlap | Open: reported; deferred | Reported 2026-09-10 with a screenshot: at very low zoom the main cabinet becomes tiny while surrounding text and controls remain comparatively large; launcher and nearby controls visibly overlap. Confirm the zoom mechanism/percentage and browser/editor viewport height, including a short embedded browser pane, before diagnosing the cause. Expected outcome: usable cabinet sizing, coherent relative scaling or responsive reflow, and non-overlapping controls with correctly aligned socket targets. Existing normal-viewport layout passes do not establish coverage of this reported state. Recording only; no layout fix or board/rules change approved in this turn. See HISTORY.md H020. |

## Recommended Priorities - Discussion Only

Recommendation recorded 2026-09-08 in H012. In H013 the user agreed on D09, D03,
then D01 as the main focus, beginning with D09 discussion only. This is not
implementation approval, a selected theme, or a sales forecast. The other rankings
remain recommendations, and all deferred implementation statuses are unchanged.

| Priority | Items | Reason / First Question |
| --- | --- | --- |
| 1: sustained fun | D09 balance and meaningful decisions | Investigate whether the reported late-game ease reflects too few interesting choices after finding a strong route. Test competing builds and contract decisions, not just higher quotas or weaker payouts. Protect the opening and earned power. |
| 2: recognizable offer | D03 theme and identity | The earlier competitor review found substantial mechanical overlap. Choose a recognizable player fantasy supported by the actual tinkering and routing; a new background alone is not differentiation. Compare directions before commissioning a full art pass. |
| 3: payoff and replay | D01 endgame | Explore a memorable culmination and reasons to try another machine, such as optional mastery contracts. Greater spectacle must remain readable and performant; thousands of balls are not an automatic requirement. |
| 4: easier experimentation | D06 named workshops | Let players preserve a favorite machine while trying another without relying on manual JSON export. Coordinate the eventual storage design with D04. |
| Small parallel improvement | D07 speed-control visibility | Existing speed controls were missed in the user playtest. Improve discovery of the existing modes when approved; this helps pacing but does not replace interesting decisions. |
| Release-readiness track | D04 Steam saves / Cloud | Save reliability and clear platform behavior protect player trust. Resolve account/conflict/offline requirements before shipping or promising Cloud; this is not the main fun or sales hook. |
| Conditional, later | D02 larger board | Expand only if D01 needs genuinely new routing decisions. The observed save already had spare capacity; extra space alone may amplify D09 rather than solve it. |
| Later polish | D05 dedicated music | Revisit after the core loop and identity are convincing. Continuous current music and improved impact feedback already exist. |

H013 resource update: the user cannot arrange outside playtesting and has no
budget for paid testing/events. The H012 external-playtest proposal is not a
prerequisite for continuing. Use the feedback already available and, only after
approval, small isolated automated comparisons against the existing baseline.
Automation can check mechanics, progression, and affordability; human enjoyment
and commercial appeal remain uncertain. No new experiment has run in this turn.

## D09 Options - Not Approved

These are unselected production-rule proposals from H013-H018. H019 approved
only the diagnostic work and an isolated gift-variety trial, which was not
adopted. The other options are not implementation approvals.

The current free-gift selection ignores owned-copy counts, while paid offers use
flat part prices. Raising only shop prices would leave free duplicate acquisition
unchanged. The first proposed investigation is acquisition, not weaker effects:

- After a protected opening, gently favor less-owned unlocked kinds in free-gift
  choices without removing player choice or the existing new-unlock guarantee.
- Separately evaluate modest premiums for later copies of repeatable multipliers,
  initially considering Doubler/Crown. Count both installed and spare copies so
  returning a part does not evade the rule. Early prices remain unchanged; no
  thresholds, premium amounts, or protected opening length have been selected.
- Test these candidates separately before considering a combination. They might
  merely slow growth or move dominance to another part; neither is a proven fun
  improvement. Do not keep raising costs if meaningful choices fail to improve.
- H015 supersedes the H013 old/new-rules proposal: this is an unreleased local
  candidate, so retaining two permanent balance profiles just for the current test
  machine is not a requirement. If a change is approved later, keep a recoverable
  copy of the current save and evaluate progression in a separate fresh test run.
  Agree how continuing saves use revised rules before implementation; no save
  reset, migration, import change, or retroactive modification is authorized now.
- Leave physics, deterministic routes, current part effects, targets, launch
  budgets, payouts, retry behavior, starter parts, rewards, and capacity alone in
  the first candidate. No hard duplicate limit, diminishing-return effect, upkeep,
  new payout cap, or removal of already earned power.

H015 also sets aside extra mastery challenges solely for the existing powerful
test machine. D09 should address the progression being designed for release, not
add a separate system to make that old machine harder. This does not close D01 or
decide whether future endgame goals are worthwhile.

Plain-language examples (illustrations, not selected rules): if a player already
owns four Doublers and no Vault, later free choices could be somewhat more likely
to include Vault or another less-owned unlocked kind. The player would still pick
one free part from three distinct choices; no duplicate ban or fourth choice is
implied. Separately, a later additional Doubler might cost 7 or 9 credits instead
of the current flat 5, while early copies retain their price and every Doubler
still doubles. No ownership threshold, stage, premium, or probability is chosen.
The intent is to make another familiar multiplier compete with other useful
improvements, not merely reduce scores or force unwanted gifts. Gift weighting
would not be a reaction to the previous payout or a change to deterministic physics.

After approval, future experiments would use separate test saves, untouched
starting states, legal affordable actions, weak and route-aware policies, and
checks for both beginner stalls and replacement dominant builds. Preserve the
original full balance report. No game change or prototype may begin without the
user's explicit approval, and no price or target has been changed.

## D09 Fun-first Proposal - 2026-09-09

This was the discussion-only H018 proposal. H019 subsequently approved the
diagnosis and one isolated gift-variety trial; its outcome is recorded below.
The objective is for the
player to understand a useful adjustment, see a satisfying improvement, and have
another worthwhile decision later. One-launch clears and exceptional machines
are desirable rewards for learning; they are not automatic evidence of failure.
Repeated identical launches are not deeper play merely because they take longer.

### Evidence and Hypotheses

- A read-only summary of the existing restored 16-run report found 131 of 144
  commissions across the three route-aware policies cleared in one launch. The
  simple policy completed two of four campaigns; seeds 1 and 42 stalled at
  commission 8. These policies are not validated human skill categories. Even
  the simple policy searches all lanes, and all policies prefer buying a token
  power upgrade whenever affordable before buying paid parts.
- `chooseParts` ignores ownership; `makeOffers` uses flat prices. Free parts,
  paid parts, growing installation capacity, and token power can strengthen one
  persistent machine. Many power steps add about 50%, close to the later target
  growth of roughly 45-50%, but upgrades are finite and not necessarily affordable
  every commission. This is a possible source of passive progression, not proof
  that token power or any particular part needs a nerf.
- On seed 42 the recorded optimized payout is 19,388 at commissions 7-9 and
  29,134 at commissions 10-12. Equal payouts alone do not prove identical boards:
  the saved report lacks edit and purchase traces. A future baseline diagnostic
  should compare unchanged layouts, power-only purchases, and a small number of
  meaningful legal edits, then record what actually caused progression.

### Ranked Suggestions

| Priority | Suggestion | Intended benefit and risk |
| --- | --- | --- |
| First: diagnose | Measure progress from placement, shopping, and global power separately. Include modest local experimentation and different legal spending policies, not only near-oracle placement. | Distinguishes an easy reward for skill from several commissions that need no new decisions. Avoid making the game hard enough to defeat the strongest search script. |
| First: protect | Keep the starter machine, opening targets, free editing, five launches, and existing retry safety unchanged in the first candidate. Investigate commission-8 recovery with owned parts and affordable earlier choices. | A poor arrangement need not win unchanged, but an understandable correction should offer a route back without grinding or mandatory lucky stock. Check existing stalls rather than hiding them. |
| First tuning candidate, after approval | Gently favor less-owned unlocked kinds among later free-gift choices, retaining three distinct choices and the new-unlock guarantee. | May expose useful alternatives without weakening owned parts. Do not force variety, remove duplicates, or assume an unowned part is useful. Reject the change if it repeatedly denies a desired build or worsens stalls. |
| Separate second candidate | Consider small, bounded premiums for later copies of a demonstrably dominant multiplier, including installed and spare ownership. | Makes another duplicate compete with a different upgrade. Early copies stay affordable; any price must be visible and unambiguous when buying. Risk: punishing a favorite build or merely shifting dominance to Echo. No kinds, thresholds, or premiums selected. |
| Conditional broader pass | Check whether routing, Relay clusters, Vault banking, or mixed Crown routes offer worthwhile alternatives for their cost and slots; improve an underperformer only if comparative evidence supports it. | Rewards position, ordering, and direction instead of forcing a single recipe. Universal buffs or weakening every multiplier could recreate the same problem or erase satisfying combinations. Effects remain unchanged in the first candidate. |
| Conditional broader pass | Review later token-power purchase timing and its opportunity cost only if power-only progression is actually dominant. | Keep each upgrade visibly worthwhile, but avoid a required automatic purchase that displaces machine-building decisions. Slower growth alone is not a benefit; no power values, costs, or limits chosen. |
| After build/economy evidence | Smooth a specific target spike or weak late checkpoint only if comparison across ordinary builds supports it. Leave success as a minimum payout. | Neither blanket harder quotas nor blanket easier quotas address both observed groups. Fixed authored pacing must not react to the player's previous payout or force a prescribed number of launches. |
| Separate UI approval | Revisit D10 reward visibility with the existing three free choices, D07 discovery of existing speed controls, and factual last-cascade feedback showing what actually happened. | Makes earned upgrades and useful edits easier to notice without secretly increasing power. No optimal-route advice or automatic placement. Adding a fourth choice is a separate balance change. Preserve strong impact audio and fast access to the next action. |
| Later, separate D01 discussion | Consider an authored late payoff or genuinely different routing goals if acquisition tuning cannot sustain interesting decisions. | Adds substance instead of extending the same loop with huge quotas. Not required for the first pass, not special challenges just for the old private save, and not approval for more tokens or a larger board. |

No diminished effect for repeated owned parts, hard duplicate cap, score cap,
randomized launch physics, forced failure, upkeep, reduced launch budget, or
adaptive quota punishment is recommended. Preserve excess-as-success, earned
currency, recognizable combinations, current audiovisual feedback, and save
recoverability. The first experiment does not combine gift, price, power, and
target changes.

### Acceptance Before Adopting a Candidate

- As a provisional feel target, a reasonable evolving machine might often need
  two to four launches, a strong one one or two, with occasional spectacular
  clears. These are discussion examples, not mandatory bands or selected target
  values. A brilliant machine may outperform them. The better criterion is
  whether useful choices remain without forcing repetitive launches.
- Preserve baseline reports and current saves. After approval, start comparisons
  from fresh runs with earned currency only. Agree continuing-save behavior
  separately; no reset or permanent parallel balance system is authorized.
- Compare the same seeds before and after, then use additional seeds not chosen
  to favor the candidate. Include imperfect placement, bounded experimentation,
  focused duplicate builds, mixed builds, different purchases, and recovery from
  a mistake. Do not treat random placement as something that must always win.
- Require unchanged opening behavior, no new weak-policy stalls in the matched
  sample, retained viable focused builds and large payouts, affordable recovery,
  and evidence that a worthwhile edit or alternative purchase matters. Inspect
  losing runs, not just process exit codes or average completion rates.
- Stop if a candidate only reduces scores, adds identical launches, worsens
  reward frustration, or moves the same dominance to another part. Passing rule,
  save, and UI tests is necessary but cannot establish human satisfaction. Use
  the user's available feedback; paid or outside playtesting is not a prerequisite
  for this work. No new simulations or gameplay tests ran for this proposal.

## D09 First Experiment - Not Adopted

The user approved the recommended first pass and asked for tests and experience
checks. The candidate kept the first six shops and the first two later choices
unchanged, with a 25% chance to replace only the third later campaign gift with
a less-owned unlocked kind. It lives only in the test/diagnostic tooling, not the
normal game. No prices, effects, quotas, power values, or earned saves changed.

All 176 diagnostic campaigns used fresh states and legal earned purchases. The
original 16-run baseline was reproduced exactly and preserved. There were no new
stalls, timeouts, or token-bound violations, but also no improvement in completion
or recovery. The one changed campaign needed more repetition for a lower peak
payout. That does not meet the fun-first acceptance criterion.

Desktop/mobile UI tests used a shop earned through real simulation, then claimed
and installed the candidate gift, launched through actual controls, and checked
exact payout and reload persistence. The examined Echo added 73 to a 4,648 payout;
the machine already beat the next 4,200 target. Functionality is verified, not
human satisfaction. Detailed evidence and policy limitations are in
[BALANCE.md](BALANCE.md#d09-first-experiment---2026-09-09).

Final regression passed: production build, 254 unit tests across 14 files, and
62 browser tests, with no failures or skips. This validates the tooling and
unchanged game, not a successful balance retune. Current evidence is in
[VERIFICATION.md](VERIFICATION.md).

Next discussion: when a strong machine becomes effectively finished, and what
later decisions should remain worthwhile without punishing earned power. The
frozen-after-six diagnostic finished 8/8 samples without further layout or power
changes; limited-edit policies still stalled. This is not permission for a blanket
quota increase, a power nerf, earlier reward changes, or new contract/endgame rules.
D09 is not resolved, and all other deferred D-items remain unchanged.

## Maintenance

- Update this file as each item is completed, deferred, or decided.
- Append the corresponding dated discussion/outcome to [HISTORY.md](HISTORY.md); do not erase earlier decisions when a later choice supersedes them.
- Include test names/commands for implemented outcomes and keep failures visible.
- Do not infer approval for deferred work from the current polish request.
- Human audio comfort, real controllers, and Steam hardware/account verification
  remain distinct from automated tests.