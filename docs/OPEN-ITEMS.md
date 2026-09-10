# Open Items and Decisions

Updated: 2026-09-10. This is the working decision and implementation tracker.
An item is resolved only when its agreed outcome is implemented and checked, or
when an explicit decision closes it without implementation. Retain the outcome
and evidence so decisions are not lost.

[HISTORY.md](HISTORY.md) preserves the chronological conversation, reasoning,
approvals, reversals, and observations. Append there after each substantive chat;
keep this file focused on current work status.

## Pre-release Working Scope

Clarified 2026-09-10: the game has not shipped. Evaluate design changes as work on
an unreleased prototype, not as migrations for hypothetical released customers.
Do not make preserving the old private test machine's balance or maintaining
parallel historical rules a prerequisite for an approved improvement. Local
executables and a public source repository are not a commercial game launch.
Ordinary data correctness remains useful, but repeated release/save-compatibility
warnings should not dominate design discussions. No actual save deletion or reset
was requested in this clarification. See HISTORY.md H027.

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

## Clockwork Theme

| ID | Item | Status | Outcome / Evidence |
| --- | --- | --- | --- |
| D03 | Theme, background, and remaining side space | Resolved: integrated payout chutes implemented | H030 approval selects the H029 recommended chutes. Replaced bowl silhouettes with three recessed openings, angled steel lips, and a continuous base fascia. Kept x1/x2/x1 badges and compact counters, with brass/red center emphasis and localized collection feedback. Rest of the H028 board and all game rules are unchanged. Thirteen focused board/workshop browser tests and the production build pass; desktop/mobile/daylight captures inspected. Reduced motion keeps intake geometry stationary. Last full-suite results remain H028's 255 unit, 74 browser, and 12 native tests; full suites, store captures, and packaged executables were not regenerated for this small pass. See HISTORY.md H030 and VERIFICATION.md. |

## Deferred and Follow-up

| ID | Item | Status | Question / Boundary |
| --- | --- | --- | --- |
| D01 | Endgame and much greater cascade chaos | Open: deferred | Reconsider progression, performance, sound density, and accounting before allowing hundreds/thousands of balls. No split-limit or endgame-economy change now. |
| D02 | Larger machine after the campaign | Open: deferred | Decide how board expansion is earned, preserves the existing machine, and supports zoom/pan. No board-geometry changes now. |
| D04 | Steam autosave / Cloud requirements | Open: investigate later | Determine whether existing native autosaves plus Steam Auto-Cloud configuration are sufficient, including account scope, conflicts, offline/reconnect, and migration. No Steam/save-architecture changes now. |
| D05 | Dedicated menu/gameplay music | Open: deferred | Evaluate separate compositions or transitions later. Current decision is continuous existing music. |
| D06 | Named workshop save slots | Open: deferred | Decide how players save and load multiple named machines. Current autosave/export remains; no save-slot UI or storage redesign in this pass. |
| D07 | Playback-speed control visibility | Open: review | Player-facing 1x, 2x, and 4x controls already exist beside Drop Token, below Pause; testing uses these same controls, not a hidden speed cheat. Fresh saves start at 1x and the chosen speed is saved. Speed changes playback time while retaining fixed-step physics and scoring. Review whether the controls need clearer placement or emphasis so players notice them. No new speed modes or UI changes authorized yet. |
| D09 | Late-game growth and meaningful difficulty | Open: first experiment evaluated, not adopted | Approved 2026-09-09: diagnosis and one isolated later-gift variety trial, with tests and actual UI checks. Completed 88 baseline plus 88 candidate legal campaigns. The trial changed 33 offers and 17 picks, but 87/88 campaign records were identical and the remaining run needed one extra launch with a lower best payout. No completion/recovery benefit or increase in later improving edits. Kept the candidate test-only; normal gameplay is unchanged. Ten focused unit checks and two desktop/mobile reward-flow checks pass. The broader balance problem remains open; prices, effects, targets, power, saves, theme, and endgame changes are not approved by this experiment. See HISTORY.md H019 and BALANCE.md. |
| D10 | Post-level part-selection visibility | Open: deferred | User reports the part-selection menu after each level is too easy to miss. Explore a prominent dialog presenting 3-4 part choices, similar to roguelite reward selection. Dialog timing, dismissal/reopening, and the exact option count remain undecided. Keep the free reward distinct from paid shop stock; changing the offered choice count requires a separate decision. No UI, reward, balance, or save changes approved. See HISTORY.md H014. |
| D11 | Low-zoom cabinet/text scaling and control overlap | Open: short-pane collapse fixed; exact zoom confirmation pending | The theme pass confirmed that the desktop height-based width formula could shrink the cabinet below its controls. Added a 320px desktop track floor with vertical scrolling in short panes; 1280x360, 1100x240, and 1920x360 browser checks pass for sizing, non-overlapping controls, lane input, and launch access. Normal mobile/desktop/ultrawide layout checks also pass. The reported zoom mechanism/percentage is still unknown; short-viewport tests are not genuine browser/editor zoom verification, so D11 remains open. No physical board geometry or rule change. See HISTORY.md H020/H026. |
| D12 | Review generic or AI-slop-looking text and images | Open: review later | Requested 2026-09-10. Audit player-facing copy and artwork for generic filler, repetitive forced whimsy, interchangeable icons, decorative gears without a purpose, inconsistent materials, and poor visual specificity. Judge the visible quality and coherence, not an unreliable attempt to detect authorship; original/procedural assets can still look generic. Review current screens and store art at actual play and thumbnail sizes. Keep deliberate personality where it helps. No copy rewrite, image replacement, or claim of universal player preference in this turn. See HISTORY.md H027. |
| D13 | Review overall text load and reading demands | Open: review later | Requested 2026-09-10. Inventory always-visible labels, repeated statistics, tutorial/part descriptions, and decorative copy; check whether players can identify the target, launches, parts, and next action without reading paragraphs. Consider concise action labels, contextual details, hover/focus/tooltips, and optional deeper explanations. Preserve essential numbers, costs, effects, free-versus-paid distinctions, and accessible names; do not replace useful information with unexplained icons. No text removal or UI redesign approved yet. See HISTORY.md H027. |
| D14 | Does completing a run require useful repositioning? | Open: review; optimized regression added | Requested explicitly even though related to D09. Assess whether, when, and why a player must move/swap/rotate parts or change lanes, distinguishing necessary improvement from voluntary edits, buying power, or repeating identical launches. H019's eight optimized machines frozen after commission 6 still finished without further layout or power changes; this is sampled evidence, not all players/seeds. Added a full fresh seed-42 optimized legal campaign regression in tests/balance.test.ts: twelve targets, owned-part/earned-purchase diagnostics, capacity, accounting safety, and improving edits pass. All 11 focused balance/gift tests pass. Completion alone does not prove that later repositioning is necessary, and no forced-rewire rule or quota change is selected. See HISTORY.md H027. |
| D15 | Dropper aiming and center-chute relevance | Open: balance review | Requested 2026-09-10, linked to D09/D14. User reports clearing levels with the dropper left at center, little apparent dependence on the collectors, and balls rarely reaching x2 until "the very end." Explore whether aiming changes that route at least one ball into the center chute should matter more or be needed to clear a level. Distinguish making the x2 payout important through balance from adding an explicit center-hit completion condition; neither is selected. Compare fixed-center and varied-lane play on matched boards/seeds through legal progression, measuring actual center arrivals, their payout contribution, retries, and stalls. Verify early, late-campaign, and endgame/After Hours difficulty, including weak and optimized builds, so the change preserves satisfying routes without excessive difficulty or a single mandatory solution. Clarify the reported timing during investigation. Review only: no target, multiplier, physics, or completion-rule change approved. See HISTORY.md H031. |

## Recommended Priorities - Discussion Only

Recommendation recorded 2026-09-08 in H012. In H013 the user agreed on D09, D03,
then D01 as the main focus, beginning with D09 discussion only. These rankings
were recommendations, not implementation approvals or sales forecasts. H026 later
records separate approval and delivery of the clockwork theme; D09 and other
unfinished items retain their current statuses above.

| Priority | Items | Reason / First Question |
| --- | --- | --- |
| 1: sustained fun | D09 balance and meaningful decisions | Investigate whether the reported late-game ease reflects too few interesting choices after finding a strong route. Test competing builds and contract decisions, not just higher quotas or weaker payouts. Protect the opening and earned power. |
| 2: recognizable offer | D03 theme and identity | Clockwork workshop selected and implemented under separate H026 approval. Review its appeal with the user; a coherent presentation is delivered, not evidence of sales or a solution to the unresolved later-game decisions. |
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

## D03 Theme Proposal - 2026-09-10

Historical H025 proposal. H026 supersedes the selection/production wait below:
the user delegated the theme choice and authorized implementation, and the
clockwork workshop was selected and delivered. Three complete alternative skins
were not made. Preserve these options as the rationale, not current open approvals.

The user requests three concrete commercially plausible themes, an explanation of
how assets would be obtained or created, and the full production steps before
any changes. These are proposals, not a selected direction or implementation
approval. D09's unsuccessful gift trial and all other deferred decisions remain
unchanged. A theme can improve recognition and the appeal of a screenshot; it
cannot by itself fix the unresolved later-game decisions or guarantee sales.

### Three Directions

| Direction | Player Fantasy and Visible Identity | Fit, Commercial Rationale, and Risk |
| --- | --- | --- |
| Clockwork inventor's workshop | Build a small, delightfully overengineered kinetic invention. A front-facing enamel cabinet sits on a workshop bench; visible springs, ratchets, numbered mechanisms, drawings, and assembled curios frame it. Teal enamel, clear yellow brass accents, red lacquer, and light neutral surfaces avoid an all-brown steampunk treatment. Token impacts release a spring, turn a visible mechanism, or ring a collector bell. | Recommended first: free tinkering, mechanical sounds, retained upgrades, and the Pocket Cascade name already support the fantasy. Precise mechanical shapes suit a reproducible original-art workflow. Risk: generic gears or clock decorations without character; clock imagery must not imply countdowns, time pressure, or a clock-repair simulator. |
| Alchemist's glass workshop | Build a cascading distillation apparatus. Colored essence beads bounce between compact glass-and-metal mechanisms, energize catalyst crystals, and fill three collector vessels. A ceramic worktop, reagent drawers, labeled glassware, and restrained ruby/amber/turquoise accents make the process tactile. | A readable transformation fantasy could interest crafting and experimentation players, with an immediately legible bottling payoff. A Fork can read as a branching condenser, Echo as a resonator, and Crown as a catalyst, without changing effects. Risk: promising recipes, gardening, customer simulation, or realistic fluid dynamics that the current game does not provide; glass and effects must remain legible. No new systems implied. |
| Miniature retro-future power plant | Assemble a desktop energy machine for a miniature settlement. Bright enamel modules, chrome fasteners, analog meters, coils, and three capacitor collectors surround crisp energy beads. A small settlement outside the playfield can illuminate on completion as proposed visual feedback, not an economy or city builder. | Strong cause-and-effect spectacle for combo/automation-minded players; small machine, visibly large output is a clear clip-sized idea. Use cobalt, white, signal yellow, and red with controlled functional light, not a generic dark neon space backdrop. Risk: implying factory automation, exploration, wiring rules, overheating, or a city-management game. |

Ranking is a judgment about this project's fit, differentiation opportunity, and
asset feasibility, not a market measurement. Clockwork is the preferred starting
point, alchemy the tactile alternative, and the power plant the spectacle-focused
alternative. The third is a concrete development of the earlier broad space/reactor
idea. Do not combine all three into one unfocused art direction. No new brand name
or claim of title/trademark availability is being made.

### Asset Plan

The existing art uses Canvas2D paths, material shading, cached layers, bounded
effects, and generated SVG source rasterized through Sharp for application icons.
Original procedural cabinet art, individual mechanism designs, sprites, textures,
props, and icon exports can be created with these tools. A game-specific vector
source may be part of the authoring workflow; final reusable bitmap assets can be
exported as PNG/WebP. Keep UI text live and fonts local, with existing palette
variables and Lucide interface icons distinct from the custom game mechanisms.

A dedicated text-to-image generator was not available from the tool search in
this session. Do not promise generated painted scenery or studio illustration
quality from code alone. The proposed no-paid-assets route is deliberately
stylized layered 2D: authored shapes, consistent lighting, designed textures,
and small purposeful animations. If that fails the approved visual target, pause
at the sample scene and choose a licensed asset pack, commissioned illustration,
or separately available image-generation workflow. No purchase, third-party upload,
or provider installation is authorized by this discussion. User-supplied art is
also possible after checking its source and rights.

An initial production inventory, subject to the chosen mockup, would be one layered
environment; one cabinet/launcher and three collectors; eight mechanism families
with directional variants and selected/disabled/activation states; a token and
small hit/split/bank/payout effect set; roughly six to ten environmental props;
and matching logo, app icon, and store-art source. Do not build three complete
skins, twelve unique rooms, a character animation pipeline, or a runtime 3D
rewrite for the first pass. Scene variations should reuse approved assets.

Keep editable originals, export recipes, and an asset manifest recording source,
license, modifications, required credit, and any generative-AI usage. Do not use
another game's images as our assets or imitate its specific characters/layout.
Any external/generated material needs appropriate commercial-use review; check
applicable Steam content-survey/disclosure rules before release. Normal play must
remain offline with bundled assets, not an external image service.

### Proposed Delivery Steps and Approval Gates

1. Agree the one-sentence player fantasy, desired mood, literal versus stylized
  materials, and what the game does not promise. Keep balance/physics separate.
2. After mockup approval, create three comparable concept screens using the same
  real machine state, board size, controls, and viewport. Evaluate full-screen
  readability and small storefront crops, including an early and busy machine.
  These are decision aids, not finished skins or evidence of sales.
3. Select one direction and lock a short art guide: palette roles, light source,
  silhouettes, line weights, texture density, typography, and animation behavior.
  Define cabinet/control safe areas; agree D11 work separately before relying on
  low-zoom/short-pane behavior. New artwork does not itself solve that defect.
4. Build one playable art sample on an isolated test save: the environment,
  cabinet, Mint/Doubler/Fork equivalents, and a real collector payoff. Assess a
  normal launch at 1x/2x/4x before producing the entire asset set. Reject a sample
  that looks like decorative wallpaper or hides where the token is going.
5. Produce the remaining approved assets with consistent scale, lighting, and
  transparent exports. Derive all interface representations from the same part
  designs. The user approves visual quality before the production art pass grows.
6. Integrate through the current renderer and cached visual layers, preserving the
  logical board, all socket hit targets, stable dimensions, accessible controls,
  local assets/fonts, and CSP. Decorative structures must not look like new
  colliders or routes that the actual simulation does not support.
7. Connect activation and collector animations to existing real events. Preserve
  exact earned accounting, bounded effects, opt-in reduced motion, and continuous
  music. Timbral polish or visual milestones require agreed theme scope; no
  dedicated menu tracks, increased split limit, or new progression system implied.
8. Validate before/after deterministic scoring, saves, and the full unit/browser
  flows. Inspect real screenshots and moving canvas pixels across desktop/mobile,
  ultrawide, fullscreen, high contrast, light/dark preferences, and dense cascades.
  Include genuine zoom/short-pane regressions when D11 implementation is approved;
  check load time, frame cost, memory, contrast, and no UI overlap.
9. Build and test Electron and both actual Windows packages using save-safe checks.
  Generate store captures and capsule/icon exports from the approved playable
  art, not an illustration that promises unsupported features. Review branding,
  asset rights, notices, and applicable disclosure before publication; no store
  upload, signing, hardware certification, or real Steam test is implied.

Suggested next authorization: three concept screens only, then choose the winner.
No concepts or assets were generated in this discussion. The existing package
screenshot and local art implementation were inspected; official storefront
descriptions for Machinarium, Potion Craft, and Nova Lands were checked as examples
of thematic communication, not direct genre comparables or sales estimates.

## Board Presentation Review - 2026-09-10

Historical H027 proposal. H028 subsequently approved and implemented the board
refinement below. The broad content-quality/text-load and repositioning reviews
remain separate open items D12-D14; this is not a balance change.

H027 discussion only. The user likes the idea of a more characterful board but
does not want blind decoration or unreadable clutter. They cited Ballionaire as
an example, expressly not a design to copy. Existing sparse and busy gameplay
captures and the board painter were inspected; no live art or layout was changed.

### Proposed Direction

- Use contrast between materials, not green on every layer: a neutral graphite
  or pale-gray playing surface, restrained red enamel housing, steel collectors,
  brass trim, and a clearly visible gold token. Reserve green for selected part
  identities and success instead of the room, UI, board, and mechanisms at once.
  Exact colors and a new palette are not selected yet.
- Reduce the permanent web of decorative connections. It competes with the real
  token route and may imply connections that do not exist. Retain factual adjacency
  cues when relevant to Relay or selection rather than removing useful rules
  feedback. Keep passive collision pegs visible; move low-value socket IDs to
  inspection/focus without changing accessible targets.
- Give installed parts stronger silhouettes and less tiny ornamental detail.
  Empty pegs, placed mechanisms, selected destinations, and moving tokens should
  be distinguishable at a glance and at small scale. Do not add fake obstacles
  or enlarge artwork in ways that misrepresent collision geometry.
- Replace the nine-tile visual impression with a recognizable hopper/drop head
  traveling along the existing nine-position rail, showing the token ready to
  release. This is a possible visual treatment of current aiming, not proposed
  new aiming physics, launch timing, or player actions.
- Make the bottom collectors look like recessed cups or chutes, with steel outer
  collectors and a visibly distinct red/brass center collector. Retain the x1/x2/x1
  labels and actual collection boundaries. A brief lever/bell/counter response
  tied to real collection can provide a payoff without unrelated idle movement.
- Keep the resting field quiet and put momentary complexity into actual cascades.
  The player's build can become dense and expressive; the artwork should not be
  equally busy in every cell. Compare a sparse board, a full board, and a dense
  scoring moment at the same sizes before accepting a look.

The intent is a more tangible mechanical toy, not a bland dashboard or a mass of
decorative machinery. Character should come from recognizable working objects
and cause/effect. Ballionaire's mention sets an aspiration for an appealing,
readable board, not permission to borrow its art, layout, or visual identity.

For the later text review, current examples worth reconsidering include the
always-visible "MADE FOR THE LITTLE MOMENTS" footer and repeatedly lyrical result
copy such as "Beautifully overachieved." These are discussion examples, not an
automatic requirement to remove all warmth. D12 addresses specificity/style;
D13 separately addresses reading load and duplicated information.

The new optimized regression establishes one legal, completable full run and
observes improving builds. D14 remains open because an optimizer making edits is
not evidence those edits were required. Future matched frozen/rebuilt comparisons
must separate layout improvements from power/spending and inspect both late
autopilot and recovery from weak arrangements, without requiring pointless moves.

## Collector Alternatives - 2026-09-10

Historical H029 discussion. H030 subsequently approved and implemented the
recommended recessed payout chutes. Gates and glass-front chambers were not
selected; the earlier board remains otherwise unchanged.

H029 discussion only. The user likes the revised board but is unsure about the
bowl-shaped collectors. The current oval rims and rounded bodies read as separate
containers in front of the cabinet, not mechanisms integrated into its base.
This is visual feedback, not a request to change the successful board or scoring.

- **Recommended: recessed payout chutes.** One continuous base assembly with
  three inset mouths, angled inner surfaces, and beveled steel lips. A short
  visible passage gives depth without a protruding bowl. Put each multiplier and
  mechanical counter into the fascia below; distinguish the center with brass/red
  treatment. A small gate response on collection provides the physical payoff.
- **Alternative: hinged catch gates.** Three low-profile openings with spring
  flaps that kick inward when a token is collected. More visibly kinetic than
  chutes, but must remain readable and must not suggest the player needs to time
  a drop or can lose a token while a gate is closed.
- **Alternative: cutaway collection chambers.** Broad mouths feed short glass-front
  chambers within the base, with a brief internal highlight or counter response.
  More toy-like and shows where the token went, but risks clutter or the impression
  that collected tokens keep physically stacking. Avoid invented scoring tokens.

All three would retain the actual three collection regions, clear x1/x2/x1 labels,
and current payout accounting. These are proposed treatments, not selected art or
new rules. No mockup, asset, runtime, or test changes were made for this discussion.

## Maintenance

- Update this file as each item is completed, deferred, or decided.
- Append the corresponding dated discussion/outcome to [HISTORY.md](HISTORY.md); do not erase earlier decisions when a later choice supersedes them.
- Include test names/commands for implemented outcomes and keep failures visible.
- Do not infer approval for deferred work from the current polish request.
- Human audio comfort, real controllers, and Steam hardware/account verification
  remain distinct from automated tests.