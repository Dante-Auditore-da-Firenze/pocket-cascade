# Pocket Cascade Conversation and Decision History

Created: 2026-09-08. This is the chronological project history requested by the user.

The initial entries reconstruct the available conversation from the first game
request through the current discussion. They preserve substantive requests,
recommendations, decisions, reversals, implementation outcomes, failures, and
verification evidence, rather than copying every repeated progress message or raw
tool log. Nothing here claims access to conversations outside that available
history. Dates follow the dates supplied in chat; save timestamps are explicitly
UTC and can fall on the previous date in the user's local time.

## How to Use This Record

- Read this history, especially the newest entries, at the start of work and after
  context compaction. Do not infer current decisions from an old entry alone.
- Append a dated entry after each substantive exchange, including discussion-only
  exchanges, and before the final response. Continue in this file across chats.
- Record what the user requested, what was proposed, what was actually approved,
  what changed, what was verified, and what remains open. Label proposals clearly.
- Preserve earlier entries. A later reversal supersedes an earlier decision; it
  does not erase the earlier reasoning. Correct factual mistakes with an explicit
  dated correction rather than silently changing the historical account.
- [OPEN-ITEMS.md](OPEN-ITEMS.md) is the current work/status tracker.
  [DESIGN.md](DESIGN.md) describes implemented behavior.
  [VERIFICATION.md](VERIFICATION.md) owns current executable/test evidence.
  [BALANCE.md](BALANCE.md) documents the original simulation sample and its limits.
- A passing test establishes the tested behavior, not human enjoyment, commercial
  demand, hardware certification, or real Steam integration.
- Do not record credentials or unnecessary personal data. Save summaries in this
  history contain relevant gameplay facts, not complete private save files.

### Entry Format for Future Chats

Use the next H-number, a date, and a descriptive heading, followed by:

- **Request / observation:** What the user asked or experienced.
- **Discussion / decision:** Alternatives, recommendation, and approval status.
- **Changes:** Files or behavior changed, or explicitly "Discussion/docs only."
- **Verification:** Commands and actual outcomes; distinguish not run from passed.
- **Open follow-up:** Tracker IDs, remaining questions, and scope boundaries.

## H001 - 2026-09-07 - Original Request and Research

### User Request

Create a full end-to-end game named **pocket-cascade** in
`C:\Repos\Personal\pocket-cascade`, using research under
`C:\Repos\Personal\new-game-research`. The user wanted a satisfying,
numbers-go-up experience inspired by Balatro, coin pushers, and Ballionaire,
with careful numerical balance, comprehensive tests, and eventual Steam release.
They authorized autonomous development decisions and asked not to wait for replies.
They explicitly prohibited initializing Git or making commits.

The game workspace was empty. The controlling research document was
`C:\Repos\Personal\new-game-research\research\games\pocket-cascade.md`,
with context from the research ranking and main research report. Those documents
were read, not treated as evidence of an already implemented game.

### Research and Direction Chosen

- Original pitch: build a tiny coin machine producing an exact chain reaction for
  tray orders. The static 1600x900 mockup showed a brass-and-green cabinet,
  editable bumpers, a launcher, token trails, and three trays.
- The research identified a conflict: exact totals can punish a stronger machine,
  undermining the desired escalating-output satisfaction.
- A minimum-payout revision had been a recommendation in the research, not yet an
  approved implementation there. Under the user's new autonomous-build request,
  the assistant chose **minimum commission targets; excess payout is success**.
- Constraint-based decisions would come from installed capacity, purchases,
  positioning, and a launch budget, not punishment for earning too much.
- Scope selected: one cabinet, eight part types, twelve commissions, a finite
  token-power track, deterministic launches, and optional continuation/replay.
  No enormous item pool, online service, paid currency, wagering, or cash-out.
- The research's USD 3.99 price and small paid-game ambition remained provisional.
  Historical market examples included Coin Factory, Ballionaire, Nodebuster, and
  Keep on Mining!; these were not a prediction of this game's sales or fair value.

### Implementation Principles

Use a proven physics library, one authoritative rules implementation shared by
browser/native/balance tools, local assets and fonts, bounded visual/audio effects,
and separate earned-value accounting. Preserve deterministic cause and effect.
No Git repository, branch, or commit was authorized or created.

## H002 - 2026-09-07 - Initial End-to-End Implementation

### What Was Built

- React 19, TypeScript, and Vite renderer; custom Canvas2D cabinet with accessible
  DOM controls; Matter.js physics at a fixed 120 Hz.
- Rules in [src/game](../src/game/engine.ts), with `DropSimulation` shared by the
  actual game, unit tests, and balance scripts. No renderer-only scoring shortcuts.
- A 500x650 logical board, 46 sockets, nine launch lanes, three collectors paying
  x1/x2/x1, eight parts, five launches per commission, twelve commissions, shops,
  free rewiring/swapping/rotation, and finite token-value upgrades.
- Parts: Mint, Doubler, Fork, Kicker, Relay, Vault, Echo, and Crown. Detailed rules
  are recorded in H005 and the current design/content files.
- Workshop campaign, daily seeded machine, After Hours continuation, local
  achievements, catalogue, statistics, and completion history.
- Version-1 Zod-validated saves, primary/backup recovery, interrupted-launch
  refunds, import/export, and visible persistence errors.
- Electron desktop application with renderer sandboxing, context isolation,
  production CSP, trusted-top-frame IPC, atomic serialized saves, and safe export.
- Optional native `steamworks.js` adapter. AppID 0 deliberately means unconfigured;
  standalone offline play works without Steam. No sample-game AppID or fake success.
- Original procedural cabinet/icon art, local Barlow Condensed and DM Sans fonts,
  Lucide icons, synthesized effects/music, local packaging, and release docs.

### Mechanical and Economy Limits

- Each equipped socket triggers once per token. Split children inherit visited
  sockets and scoring history. Two split generations create at most four tokens;
  further Fork hits multiply by 1.25 instead of adding more tokens.
- Tokens do not physically collide with each other. Slow tokens receive a
  deterministic nudge; at 12 simulated seconds, remaining tokens are collected
  at their current horizontal tray rather than deleting earned points.
- Individual values/contributions have a 1e12 numeric safety bound; launch totals
  reconcile exactly to banks plus collectors. Visual caps do not alter scoring.
- Completion pays workshop currency plus capped bonuses: up to three for unused
  launches and up to three for excess output. Points are not spendable money.
- Installed capacity starts at seven, rises to eighteen in the campaign, and is
  twenty in After Hours. The eighty-owned-part bound later received safe reward
  conversion and salvage handling; it is distinct from physical socket count.

### Important Problems Found and Fixed

1. The untouched starting machine could miss its opening target. The first target
   was reduced from 150 to 100 and verified with real starting-state launches.
2. Initially, commission advancement changed the launch seed. A learned good route
   could suddenly collapse. Quick balance runs stalled at 9/12 for conservative
   play and 8/12 for optimized play on seed 42. The seed was made stable for the
   **whole run**, not just one commission. Both policies then completed that seed.
3. Dependency audit findings in Electron and Sharp were corrected by installing
   patched releases. Subsequent audit reported zero known vulnerabilities.
4. Native startup exposed two independent issues: modern Electron imports the app
   entry, making `require.main === module` insufficient, and Playwright's Windows
   shell quoting broke on a trailing-backslash project path. The entry guard was
   corrected and test paths normalized. Plain native launch was verified separately.
5. Windows fullscreen events fired before the state getter updated. Reading the
   result on the next event-loop turn fixed the native transition check.
6. Security intentionally blocked browser downloads in Electron. A narrow,
   validated native `exportSave` method and parented save dialog were added instead
   of weakening the download or filesystem policy.
7. A full spare inventory could eventually block continuation. Owned-part limits,
   one-credit spare salvage, and a two-credit conversion for a full-inventory free
   gift were implemented. Economic trades clear placement undo history.
8. Numeric seed text initially hashed instead of replaying the displayed number.
   Numeric unsigned-32-bit seeds now replay directly; nonnumeric text is hashed.
9. A review subagent proposed a lifetime-score undo exploit, but its suggested fix
   was algebraically equivalent to the existing code and its trace did not match
   launch-cleared undo history. It was not treated as a confirmed scoring bug.
   The real transaction-history protection was to clear undo/redo on purchases,
   salvage, collection, advancement, new runs, and imports.
10. Short simulated-controller pulses became flaky under parallel load. Test input
    was synchronized with rendered frames; the production input behavior was not
    weakened to satisfy the test.

### Balance Measurements and Their Limits

The complete report used actual affordable actions from untouched initial saves,
four seeds (1, 42, 2026, 65537), and four policies. The original report remains in
[artifacts/balance/report.json](../artifacts/balance/report.json).

| Policy | Campaign Wins | Launches Per Run | Best-Drop Range | Important Limitation |
| --- | --- | --- | --- | --- |
| Beginner | 2/4 | 24-55 | 696-5,954 | Fixed preferred sockets, but already searches the best lane; not a human novice model. |
| Conservative | 4/4 | 12-18 | 7,057-118,800 | Conservative spending, but brute-evaluates placements and lanes. |
| Optimized | 4/4 | 12-13 | 18,384-110,189 | Greedy local rebuild, not a global optimum. |
| Splitter-focused | 4/4 | 12-16 | 8,761-24,676 | A targeted combo policy, not exhaustive coverage. |

No timeouts or token-bound violations occurred in that sample. Beginner policies
on seeds 1 and 42 stalled at commission 8. Strong policies could finish much of
the campaign with one launch per commission. The late-output variance and loss of
interesting decisions were explicitly recognized as unresolved balance concerns.

Simulated cascade watching time ranged from 36.45 to 178 seconds, excluding menus,
planning, pauses, and candidate-search work. It was **not** called human campaign
length or evidence for a 20-minute/hour content promise.

A separate relaxed-target beginner probe also won only two of four seeds: 1 and
65537 finished, while 42 and 2026 stalled at commission 10. That did not replace
the full report or establish novice accessibility.

### Advisor Introduced, Later Reversed

After the weak-policy failures, an optional loss-screen **Inspect my machine**
advisor was implemented. A local worker searched for one owned-part/lane edit,
showed measured before/after payout, and granted no parts, money, points, or drops.
It passed unit/browser/native checks. **The user later rejected this direction;
H006 records its removal. It is not a current feature.**

### Desktop Packaging and Release Materials

- Windows portable and unpacked builds were produced. Both were launched as actual
  executables, not only through source-mode Electron.
- Windows extraction repeatedly failed to rename a generated staging directory.
  Packaging was changed to reuse the locked installed Electron runtime, with a
  preparation script ensuring that binary exists. No privilege escalation was used.
- Direct Playwright Electron launch could not observe the portable wrapper's
  debugging stderr. Package smoke tests connect through local CDP, exercise the
  real launchers, inspect rendering/native saves/CSP/isolation, and quit through
  the save-aware API. Normal gameplay does not enable a debugging port.
- Original icon assets, a generated dependency-notice bundle, five 1920x1080
  actual-play screenshots, Steam capsule/library assets, and achievement icons
  were generated. Achievement icons share the machine insignia, not ten separately
  illustrated achievements. Store size requirements were checked against Valve docs.
- A browser artwork-generator serialization issue was corrected by removing an
  out-of-scope transpiler helper dependency. Generated captures are actual legal
  play, not the original concept mockup.
- A license-notice generator was narrowed to the shipped Electron runtime license
  instead of unshipped npm installer dependencies. No legal approval was inferred.
- README plus design, balance, testing, Steam, store, release checklist, and dated
  verification documentation were created. Unsigned binaries may show Windows warnings.

### Initial Delivery Evidence

Initial complete delivery: production build, **187 unit tests**, **21 browser
tests**, **8 native tests**, and both packaged launchers passed. The unit count
included the then-present advisor. Intermediate counts were replaced by this
consolidated result; later history entries record subsequent builds.

Real Steam AppID/achievements/Cloud/overlay, physical speakers/controllers, Deck,
signing, clean-machine coverage, human enjoyment/value, legal approval, and actual
store upload remained release gates. No account, payment, Steam upload, Git repo,
branch, or commit was created.

## H003 - 2026-09-07 - Similar Games and Differentiation

### User Question

The user liked the presentation but suspected that others had already made similar
games. They asked for a competitor check, not code changes.

### Research Findings

Official Steam/developer pages were checked. Published mechanics were distinguished
from hands-on verification; upcoming promises were not described as proven content.

| Game | Status at Research Time | Relevant Overlap / Difference |
| --- | --- | --- |
| [Ballionaire](https://store.steampowered.com/app/2667120/) | Released | Closest established comparison: place triggers, spawn balls, score combos, meet monetary demands. Advertised 145+ triggers, 55+ boons, multiple boards, sandbox, and mods. |
| [Pin A Million](https://store.steampowered.com/app/5012230/) | Upcoming; playtest offered | [Developer page](https://onkeltora.itch.io/pin-a-million) explicitly advertised purchased peg placement, shops, combinations, and limited-round quotas; peg fusion, weather, and metaprogression distinguish its advertised direction. |
| [Idle Mint](https://jallen-dev.itch.io/idle-mint) | Free browser demo, in development | Purchase, upgrade, and reposition pegs in a coin-earning machine. Focuses on continuous idle/offline progress rather than scarce-launch commissions. |
| [Void Pachinko](https://store.steampowered.com/app/4077060/) | Released August 2026 | Place pins, upgrade balls, and reinvest in scoring setups; active rotating barrier, skill tree, village restoration. |
| [Peganomics](https://store.steampowered.com/app/3824090/) | Released August 2026 | Ball/peg/bucket synergies and escalating scores. Official text did not establish that it has our free-placement editor. |
| [Pachinko Farm](https://store.steampowered.com/app/3598690/) | Early Access, August 2026 | Physics-driven production, upgrades, structures and board manipulation, duplication, level-based farming progression. |
| [Pegfinity](https://store.steampowered.com/app/3947040/) | Released August 2026 | Multipliers, special balls, pegs, portals, and persistent upgrades; advertised randomly generated boards rather than one freely rewired persistent cabinet. |
| [RACCOIN](https://store.steampowered.com/app/3784030/) | Released | Coin-pusher combos, special coins/items and roguelike structure; adjacent physical satisfaction rather than the same peg editor. |
| [Peglin](https://store.steampowered.com/app/1296610/) | Released | Pachinko shots drive RPG combat, orb/relic builds, and run survival; less directly a money-machine builder. |

The comparison did not infer sales or market saturation from review counts.
US store prices were researched as dated standalone listings, not regional
conversions or bundles; they were not the basis of an originality claim.

### Conclusion and Proposed Direction

- Neither peg placement, splitting, multipliers, nor payout quotas is unique.
- The current game risks reading as a smaller Ballionaire with different art.
- Working end to end is not the same as differentiated enough to sell.
- Strongest proposed identity: deliberate, repeatable machine tinkering, free
  rewiring, and understanding why one clever adjustment changes the result.
- A distinctive routing system (switches, gates, or storage/release) and more
  meaningful contracts were proposed, not implemented or claimed unprecedented.
- Recommendation: inspect/play the closest demos before adding a large item pool;
  ask what enjoyable decision Pocket Cascade offers that those games do not.
- No abandonment, price change, roguelite pivot, or new routing system was approved.

## H004 - 2026-09-07 - Genre, Failure, Audio, Endgame, and Theme Questions

The user asked five questions. The assistant checked code and separated current
behavior from recommendations. No changes were made in this exchange.

### Genre

Current classification: a physics-based combo builder with a retryable campaign,
not a traditional roguelike and not a full run-loss roguelite. Seeded shops and
upgrade choices borrow from those genres, but losing does not end a machine and
catalogue/achievements are not substantial permanent power progression.

Recommendation: do not pivot simply because competitors use the roguelite label.
A small optional run-ending challenge mode could be prototyped later, but adding
permadeath alone would make repetition more punitive, not more interesting. No
roguelite conversion or extra mode was approved or implemented.

### Failure and Loop

Arrange owned parts and choose a lane; launch up to five times; rewire between
launches; reach a cumulative minimum target; collect currency/free part; purchase
optional upgrades; advance. Overshooting earns a bounded bonus, never failure.

A missed target shows a loss panel, not character death or permanent game over.
The machine, upgrades, and currency remain. The existing loss-only retry resets
attempt points/drops and adds +10% base value per retry, capped at +30%; the bonus
resets at the next commission. At that time, a mid-run relaxed-target option and
advisor also existed. Later decisions remove those UI paths selectively.

The unchanged deterministic route can become routine once solved. Higher quotas
alone may turn play into repeating a known payout. This was noted as a design risk.

### Audio at That Time

Background synthesis, launch cue, rising scoring-hit notes, split/collector cues,
interface clicks, and success flourish existed. Passive pegs and walls were silent,
and many mechanisms shared a musical sound family. Stronger physical feedback and
distinct mechanisms were recommended. Digital audio had been tested, not heard
through physical hardware by the assistant. Browser sound starts after interaction.

### Endgame at That Time

Twelve commissions ended at a normal 20,000-point target and the "Look what you
made" summary. Players could continue After Hours, start another seed/daily, and
pursue achievements. After Hours reused the same parts, finite power track, and
quotas growing by 1.38, capped at one billion; it was not a deep authored endgame.

A final exhibition/demanding commission and mechanically varied mastery contracts
were suggested. No final boss, prestige system, new world, or endgame expansion
was approved.

### Theme and Background

The screen had a subtle texture and lighting, not an actual environment. The
assistant preferred a whimsical clockwork inventor workshop with workbench, lamp,
blueprints, spare mechanisms, and visible progress toward a grand exhibition.
Space-reactor and character/animal-led workshop/arcade alternatives were discussed.

Theme should express the player's role and decisions, not just add wallpaper.
Space would be more meaningful with energy/gravity/routing mechanics; characters
would require coherent art and a role. A theme could aid recognition, not guarantee
sales. The inventor setting remained a recommendation, **not a selected theme**.

## H005 - 2026-09-07 - First Human Playtest and Proposed Polish

### User Observations

The user actually played and said the game felt good. They heard audio but wanted
each impact more prominent, wanted music not to stop in menus, and considered
removing reduced motion or hiding its toggle. They had not read the instructions
and initially did not know the objective, what brass meant, or why some parts were
free and others purchased. They noticed empty side space and questioned fullscreen.

They preferred removing machine suggestions so the player builds their own machine.
They imagined an endgame with thousands of balls and a larger board, thought that
spectacle would be fun to watch, and wanted a theme but had not chosen one. They
explicitly requested discussion and a change list, not implementation yet.

### Proposed Eight-Item Polish List

1. Physical ticks for all contacts, stronger scoring activations, distinct mechanism
   and collector sounds, relative mix improvement, and bounded dense-burst audio.
2. Keep the same music running through menus, perhaps softer. Dedicated menu tracks
   and more elaborate musical transitions can wait.
3. A short playable introduction: place, launch, fill target, collect, and spend.
   One instruction at a time; teach tools without showing an optimal route.
4. Distinguish points (target), launches (attempts), and Workshop credits (shop).
   Use separate imagery, labeled wallet feedback, and "Choose ONE free part."
5. Remove calculated machine suggestions; keep factual descriptions and trails.
6. Enlarge the visible cabinet, bring side panels closer, and make spare inventory
   useful. Layout scaling is not enlarging the actual game board.
7. Deliberate borderless fullscreen startup, a clear windowed option, and remembered
   display choice. Browser fullscreen has separate permission restrictions.
8. Retain reduced-motion support in Accessibility rather than deleting it. The
   initial recommendation mentioned respecting the OS; the subsequent user request
   explicitly rejected automatic enabling and that later choice controls behavior.

### Larger Ideas Left for Later

Earned endgame growth was proposed: more branching, more launchers, expanded machine
sections, and eventually dense coordinated cascades. Simply removing the four-token
cap would not solve physics, audio, readability, or payout-accounting requirements.
Expansion should preserve the machine and support suitable zoom/pan. The user did
not approve that rework. Theme options remained unselected; a two-mockup comparison
was recommended rather than silently committing to an art direction.

## H006 - 2026-09-07 - Approved Polish and Open-Items Tracker

### User Approval and Boundaries

The user requested a durable open-items document, with items resolved only after
implementation/validation or an explicit outcome decision. They approved items
1, 2, 3, 7, and 8, and gave discretion on 4, 5, and 6 where useful. They specifically
required reduced motion **not on by default**, and emphasized tests because there
was no separate regression-validation team.

They explicitly deferred **endgame/chaos**, **theme**, and **Steam-specific autosave
requirements**. Board expansion and dedicated menu composition remained related
deferred items. [OPEN-ITEMS.md](OPEN-ITEMS.md) was created as the status tracker.

### Implemented P01-P09

- **P01 audio:** separate ephemeral `PhysicalImpact` contacts for passive/repeated
  peg and wall hits; no impact records added to scoring saves. Distinct mechanism
  and collector transients, short aggregation, bounded voice/start rates, and the
  production soft limiter improve presence without changing earned points.
- **P02 music:** same musical clock continues in menus/paused state at 80% of the
  selected music gain. No track restart; mute remains effective. Separate tracks
  were not added.
- **P03 onboarding:** nonblocking Quick Guide for place/launch/collect/gift/spend,
  progress highlights, skip, replay through Settings, optional saved tutorial step,
  compatibility with existing `seenTutorial`. It permits out-of-order play and
  saving credits instead of buying. No solution or artificial reward is granted.
- **P04 currency:** brass renamed **Workshop credits** in player-facing UI, with
  a Ticket-icon wallet and earned/spent receipts. Internal `RunState.brass`, prices,
  balances, and saves remain. Free selection is separate and disappears on claim;
  paid stock and power upgrades remain optional.
- **P05 advisor:** calculated helper, worker, and UI removed by user decision.
  Tests now assert absence and preserve manual loss editing. Do not reintroduce it
  without approval.
- **P06 layout:** height-aware cabinet sizing and closer bounded side panels,
  responsive through mobile/full-HD/ultrawide. No physical board expansion or new
  background art. Remaining side-space composition stayed open under theme.
- **P07 fullscreen:** fresh native games start standard borderless fullscreen
  before showing the window, without exclusive resolution changes. Windowed mode
  restores normal frame/resizing; toolbar/Settings/F11 controls persist preferences.
  Preserving old false values later proved incomplete; see H008.
- **P08 accessibility:** reduced motion and high contrast moved into Accessibility.
  Reduced motion defaults off even if the OS requests it; an explicit saved true
  remains honored. The automatic OS-enabling code was removed.
- **P09 verification/delivery:** source tests, native tests, Windows rebuilds,
  actual executable launches, gameplay captures, and verification docs refreshed.

### Evidence and Lessons

The pass finished with **221 unit tests**, **47 browser tests**, **10 native tests**,
and both rebuilt Windows launchers passing. New tests measured production PCM at
44.1/48 kHz, stronger feedback relative to the prior tone, passive contact presence,
mute, limiter headroom, voice bounds, unchanged score traces, actual impact
delivery, and continuous music clock during real menu-open/close interaction.

Guide tests covered exact credit deductions, free-gift nonpayment, optional
spending, replay, skip, and reload. Eighteen layout tests checked canvas screenshot
paint as well as buffers and non-overlapping controls across 320px to 3440px widths.
No physical-speaker, real-controller, or Steam/Cloud verification was claimed.

Game scoring, prices, split limits, and the retained 16-run balance report were not
retuned. Project instructions were updated to maintain the tracker and preserve
explicitly deferred work. No Git operation occurred.

## H007 - 2026-09-07 - Eight Follow-up Questions

The user again requested discussion only. The assistant read the current code and
selected native-save fields without modifying the save.

### Fullscreen and Restarts

- The user still saw windowed startup. The native save contained `fullscreen: false`.
  New Workshop reset the run, not settings, so it retained the earlier default.
  The assistant acknowledged that the initial fullscreen change missed migration.
- Proposed fix: one-time adoption of fullscreen for old unmarked preferences, then
  remember future explicit choices. F11 was an immediate available workaround.
- Retry commission existed only after failure. The user requested quick current-
  level restart plus a separate level-1 reset opening the New Workshop dialog.
- Recommendation: same-difficulty restart retains possessions, resets attempt
  score/drops, and cannot farm credits/gifts or duplicate completed rewards.

### Difficulty Assistance

The user wanted the **Continue with relaxed targets** action removed. The assistant
distinguished that mid-run prompt from initial New Workshop difficulty and the
existing +10%-per-loss-retry tune-up. The recommendation was to remove the prompt;
subsequent implementation retained those other two existing behaviors. A general
removal of every assistance mechanism was not approved or implemented.

### Seeds, Saves, and Daily Mode

- No database of every seed is needed. A numeric seed drives deterministic launch
  variation and seeded shops; text input hashes to a number. The chosen seed is
  stored with the active run. Repeatability assumes the same game version/actions.
- A seed recreates starting conditions, not a player's built machine. Full progress
  requires layout, owned parts, purchases, stage, and related save state.
- Autosave already stores one active machine. Native primary is
  `%APPDATA%\Pocket Cascade\pocket-cascade-save.json`, with previous-valid backup;
  browser saves are origin-specific local storage. Export/import transfers JSON.
- There are no named save slots or central player/seed database. Completed history
  stores seeds/results, not restorable whole workshops. Named local saves were
  recommended as a separate feature, not implemented.
- Daily Machine is the same twelve commissions using a seed derived from the UTC
  date; same version/date gives the same starting conditions and generated shops,
  not identical outcomes after different choices. It has no leaderboard/account/
  server verification and is not newly authored content every day.

### Why Only One Part Appeared Placeable

The user's then-current native save was commission 6, loss phase, 12/12 installed,
no spares, 12 credits, and power level 0. It did not prove every previous purchase
path, but established that this machine was full despite visible empty sockets.

Both free and purchased parts were owned. Only the latest acquired item was
selected; other spares were hidden behind the Workbench tab. Capacity increases by
one each campaign level, and the between-level shop still uses the completed
level's cap until advancement. Heavier pockets is a global token-value upgrade,
not a tile. Recommendation: keep spares visible and explain capacity/timing.

### All Eight Placeable Parts Explained

| Part | Effect | Availability |
| --- | --- | --- |
| Mint (+) | Adds 140% of base token value; base 10 gives +14. | Start |
| Doubler (x2) | Doubles current token value. | Start |
| Fork (Y) | Adds a child worth 75%; parent keeps its value. Two generations; further hits give x1.25. | Start |
| Kicker (>) | Adds one base value and kicks left/right with an upward component; rotatable. | Shop after commission 2 |
| Relay (*) | Adds one base value plus another per adjacent installed part. | Shop after commission 3 |
| Vault (=) | Banks 50% immediately without reducing the token's later payout. | Shop after commission 4 |
| Echo (~) | Repeats last recorded Mint/Doubler/Relay/Crown addition or multiplier; fallback adds one base value. | Shop after commission 5 |
| Crown (W) | Multiplies by 1 + 0.4 per distinct encountered part kind, including itself. | Shop after commission 6 |

Each equipped socket triggers once per token. Echo does not repeat split, bank, or
routing effects. The player catalogue contains these rules; unlock availability
does not guarantee every later random offer contains that part.

## H008 - 2026-09-07 - Approved Restart, Fullscreen, and Inventory Follow-ups

The user replied **"sure let's go ahead"** to the four immediate recommendations.
The assistant explicitly scoped this to fullscreen migration, two restart controls,
mid-run prompt removal, and inventory/capacity clarity. Named saves and previous
deferred design work were not included.

### Implemented P10-P14

- **P10 migration:** optional `settings.fullscreenPreferenceVersion: 1`. Fresh saves
  mark the new preference; native startup honors marked choices and opens unmarked
  old saves fullscreen once. Native load/import applies the same migration and
  autosaves; browser-only parsing does not force fullscreen. An intentional old
  false cannot be distinguished from the old default, so both receive this single
  user-authorized upgrade. Subsequent windowed choices persist normally.
- **P11 controls:** rotate-arrow Restart level above the board and in the menu,
  plus New Workshop opening the existing confirmation/seed dialog. Quick restart
  is allowed only ready/dropping/lost; it resets score, drops to five, active token,
  and last result, retaining layout, spares, credits, upgrades, seed, difficulty,
  existing retry count, and cumulative totals. No new reward or tune-up. Success,
  shop, and victory reject restart to prevent reopening rewards. New Workshop
  cancellation preserves the machine; confirmation preserves profile/settings.
- **P12 loss prompt:** the mid-run relaxed action and `relaxCommission` helper
  removed. Initial relaxed Workshop creation, existing assisted saves, and the
  older loss-only Retry commission tune-up remain. Do not confuse Retry with the
  new same-difficulty Restart control.
- **P13 inventory:** `PartInventory` remains visible above the shop/editing views.
  Every owned spare still has an individual button at this stage. Installed/free
  capacity is next to the board controls. A full notice explains swaps/returns;
  shop text states the next cap and when it opens. Both free and paid acquisitions
  are independently selectable. Power-up text says "All tokens. No part to place."
- **P14 delivery:** complete regressions, Windows rebuilds/actual launches, updated
  screenshots/hashes, and documentation. Named saves recorded as D06 deferred.

### Validation and Local Findings

The taller toolbar initially pushed Launch below shorter viewports and guide
layouts. The height reservation was corrected from 180/280px to 212/312px and
all eighteen layout tests passed. The logical board did not change. A singular
capacity label was corrected to "1 space free" and retested.

Final evidence: **238 unit tests in 12 files**, **52 browser tests**, **11 native
tests**, both rebuilt executables passing smoke checks, and zero audit findings.
The browser suite was rerun after the final wording correction. New tests cover
live-token cancellation, restart conservation, New Workshop cancellation, two
acquired parts placed while shopping, a safe blocked-at-capacity placement, and
installation after advancing to the advertised next capacity.

Native tests prove old-save fullscreen adoption once, complete state preservation,
and remembered later windowed choice after relaunch. Package smoke tests then used
the normal local save without playing: it now had fullscreen true/version 1 while
retaining commission 6, 12 installed parts, and 12 credits. Both executables remain
unsigned. No Git initialization/commits occurred.

No scoring/price/capacity retune or full balance-report regeneration happened in
this pass. The earlier 16-run report was retained, with its limitations intact.

## H009 - 2026-09-07 - Speed Controls and Empty Side Space

The user noticed speed-up during tests, asked whether players had it too, and
requested logging the question. They also asked what had been decided about the
remaining left/right space. This was a documentation-only exchange.

- Existing **1x, 2x, 4x** controls sit beside Drop Token below Pause. Automated
  gameplay uses the same player controls, not a hidden speed cheat. Fresh saves
  start at 1x; the choice persists. Playback speed retains fixed-step results.
- **D07** added for discoverability/placement review, not implementation of another
  speed mode. No UI or speed behavior was changed.
- **P06 layout scaling is complete**, but **D03 background/theme/remaining side
  composition is still open**. A workshop theme had only been recommended.
  Margins were not to be filled with arbitrary extra panels just to occupy space.

## H010 - 2026-09-08 - Duplicate Stacks, Late-game Ease, and This History

### User Request and Boundaries

The user asked for repeated identical spares to share one icon with x2/x3 counts.
They also reported that later levels felt too easy: adding parts made scores grow
at an extreme rate, and they asked the assistant to inspect their save as evidence.
They explicitly requested **no gameplay changes; discuss first**.

They requested this history from start to finish, to retain decisions when the
context window fills, and asked that future chats append to the same file.

### Actions in This Exchange

- Created this chronological history and linked it from README/current tracker.
- Added project instructions to read recent history at session start/resume and
  append substantive requests, decisions, outcomes, and open questions every chat.
- Added **D08 spare-stack presentation** and **D09 progression/balance review** as
  open discussion items, not resolved or implemented changes.
- Inspected the current native save read-only. Did not edit the save, game code,
  assets, settings, payouts, test fixtures, or balance report. No gameplay simulation
  or campaign run was required to read the stored facts below.

### Observed Native Save

Read during the 2026-09-08 discussion; the saved timestamp is
`2026-09-07T19:11:30.862Z` (UTC). This is a snapshot, not a permanent description
of the player's later machine.

| Fact | Observed Value |
| --- | --- |
| Seed | 2057171028 |
| Mode | After Hours (`endless`), normal targets (`assisted: false`) |
| Progress | Displayed level 17 / After Hours 5; shop phase after clearing its target |
| Current target | 100,098 from the existing normal After Hours formula |
| Current commission payout | 131,664, with two of five launches remaining |
| Latest / run-best drop | 43,888 points |
| Installed parts | 17 of 20 allowed |
| Installed composition | 6 Doublers, 4 Crowns, 2 Forks, 2 Mints, 1 Kicker, 1 Relay, 1 Vault |
| Spare inventory | 9 total: 3 Mints, 3 Echoes, 2 Forks, 1 Relay; all stored direction +1 |
| Power | Level 7 of the 0-8 track; base value 175 versus initial 10 |
| Credits | 76 |
| Current commission retry count | 0; this does not establish zero retries throughout the run |
| Latest drop detail | 18 scoring hits, chain length 9, 2 splits (3 total tokens), 288 banked, collector totals 15,484 / 27,416 / 700 |
| Latest simulation | 394 ticks, about 3.28 seconds at 1x; no timeout |
| Cumulative run counters | 119 settled launches and 470,622 points, not a per-level decision log |
| Campaign completion history | Same seed, 98,842 cumulative points and 15,279 best drop at the twelve-commission victory |

Interpretation: the current After Hours target still required three launches, so
this save is **not** evidence that every later stage was cleared in one shot.
Current output must not be compared to an earlier campaign target as though the
same machine/power necessarily existed then. The save does not retain every
historical purchase, placement, retry, or per-level payout, so exact difficulty
timing cannot be reconstructed from it alone.

### Duplicate Spare Presentation - Proposed, Not Implemented

- Agree with showing one icon per behaviorally identical spare group, with an
  inventory quantity badge. The observed nine spares would become four visible
  entries: Mint x3, Echo x3, Fork x2, Relay x1.
- This should be a UI grouping, not merging saved part instances. Keep individual
  IDs, ownership, directions, and undo/salvage behavior. Placing one reduces the
  count; returning it restores the count. Buying/claiming adds to the right group.
- Keep the quantity badge visually distinct from the Doubler's x2 effect symbol.
  A group of three Doublers must not imply a new x3 scoring effect.
- Do not silently combine differently configured pieces. Direction matters for
  Fork/Kicker; handling rotation within groups and retaining selected-stack focus
  need a deliberate choice before implementation.
- Tests for counts, last-item removal, identical/different directions, purchase,
  return, undo, salvage, save/reload, and accessible selection would accompany a
  later approved change. No stacking behavior was implemented in this exchange.

### Difficulty Assessment - Discussion, Not a Retune

The assistant's assessment is **the progression becomes too permissive once a good
scoring route is established**, not that the game is uniformly easy for all players.
The user's play report and six-Doubler/four-Crown machine are consistent with the
earlier automated sample, which already showed large late outputs and many one-
launch commissions for route-aware policies while two beginner seeds stalled.

Possible reasons, grounded in the current rules:

- Every successful commission supplies another free part, more currency, and later
  more capacity. Purchases add still more improvements to the same learned machine.
- Repeated multiplicative parts compound existing value, including increased base
  value. Six successive Doublers would mean x64 on a token that actually hits all
  six; this is a mathematical illustration, not a claim that every saved trajectory
  traverses every installed part. Multiple Crowns can also multiply sequentially.
- The seed and unchanged geometry make a proven route repeat. Once its payout is
  sufficient, remaining launches can become waiting for the same result rather
  than making another interesting choice.
- More quota alone can demand more identical launches; adapting quotas directly to
  the player's output would risk erasing the reward for building a better machine.
- The actual save has unused installed capacity, nine spares, and 76 credits. This
  supports discussing a weakening resource trade-off, not proving every purchase
  was trivial or the current After Hours quota had no pressure.

Recommendation for a later design decision: preserve earned big numbers and
occasional spectacular wins, while restoring meaningful build choices. Evaluate
repeated-multiplier availability/cost, whether duplicate finishers dominate diverse
routes, and more varied contract decisions. These are alternatives to investigate,
not approved caps, nerfs, new mechanics, or new target values.

Do not quietly reintroduce randomness into learned routes, punish excess payout,
add exact-total failure, remove purchased power from an existing save, or make the
already harder beginner path worse just to suppress late-game output. A potential
distinction between a campaign with meaningful pressure and a more spectacular
post-campaign sandbox remains discussion tied to the deferred endgame work.

### Status at the End of This Exchange

Only documentation, project instructions, and project memory were changed. The
current game still shows individual spare icons and uses unchanged balance values.
The latest runtime evidence remains the prior 238 unit / 52 browser / 11 native
tests and both packaged launchers; it is not a new runtime test claim for today.
This document and tracker links are checked after creation. D08 and D09 await
discussion and implementation approval.

## H011 - 2026-09-08 - Approved Spare Icons and Deferred Balance Review

### User Approval and Boundary

The user approved the previously proposed icon change for now and asked to keep
balancing in open items with the assistant's recommendations. They emphasized that
balance matters to the game's fun and must be revisited, but a blanket difficulty
increase would damage the initial runs. This approves D08 only, not a retune.

D09 now explicitly records reviewing repeated Doubler/Crown availability or cost,
reward/capacity growth, competing build choices, and varied contract decisions.
These remain proposals, not selected nerfs or new mechanics. Protect opening
difficulty, earned big payouts, deterministic routes, and existing saves; measure
early stalls and later route dominance separately through affordable play and
human playtests. No adaptive quota punishment or blanket target increase.

### Implemented Presentation Change

- Added the pure grouping helper in [partStacks.ts](../src/components/partStacks.ts)
  and integrated it into [PartInventory.tsx](../src/components/PartInventory.tsx).
  Equivalent spares share one icon, in stable first-appearance order. The inventory
  heading still counts every spare rather than visible groups.
- A reserved corner row holds an xN quantity badge for duplicates, separate from
  the part's effect symbol. Singleton badges are hidden without moving the icon.
  Left/right Forks and Kickers have separate groups with Lucide direction arrows;
  irrelevant direction metadata on other kinds is retained, not rewritten.
- The selected actual ID stays selected within its group, including newly claimed
  or bought duplicates. Otherwise a group selects its first available copy.
  Placement retains the existing deselection behavior. Placement, return,
  rotation, salvage, and undo/redo still affect real individual instances.
- No engine, physics, prices, targets, rewards, capacities, part effects, or save
  schema changed. The version-1 bench still stores every part ID and direction.
  No save migration or manual player-save edit was needed.
- Updated browser test controls and the legal-campaign helper to select equivalent
  spare groups while retaining individual-ownership assertions. Added a native
  test that earns and buys duplicates, closes/relaunches, and places one copy.
- Updated README, design, testing, verification, and the tracker. D08 moved to a
  resolved follow-up section; D09 and all other deferred items remain open.

### Actual Validation and Delivery

| Check | Observed Result |
| --- | --- |
| `npm test -- tests/part-stacks.test.ts` | Eight grouping cases passed: counts, direction distinction, IDs, one-copy actions, last-copy removal, and unchanged save instances. |
| Focused stack and restart/inventory browser tests | Thirteen passed, including free and purchased duplicates in one group, one-copy placement/return/rotation/salvage, undo/redo, reload, disabled controls, deselection, and keyboard selection. |
| `npm run verify` | Production build, 246 unit tests across 13 files, and all 60 browser tests passed. The real-control campaign still completed all twelve commissions and entered After Hours. |
| `npm run test:desktop` | All 12 native Electron tests passed against a fresh production build, including the earned-duplicate relaunch/placement case. |
| `npm run package:win` | Portable and unpacked Windows outputs rebuilt, including generated icons and notices for 12 components. |
| `npm run test:package` | Both final actual executables launched, painted the machine, read the native save, retained CSP/renderer isolation, and quit through the save-aware API. |
| Player-state conservation | A read-only before/after fingerprint of save version, run, profile, and settings matched across both packaged launches. Normal autosave timestamps were excluded. |
| Visual checks | Inspected grouped-spare and 320px quantity/effect screenshots, plus both packaged windows. The real player's nine spares render as Relay, Mint x3, Fork x2, and Echo x3. |
| `npm run assets:steam` | Refreshed five 1920x1080 actual-play screenshots, eight capsule/library images, and twenty achievement icons through the existing legal campaign capture script. No store upload. |
| `npm audit` | Zero known vulnerabilities reported. |
| Signing / Git | Both executables explicitly report NotSigned. No Git directory, branches, or commits created. |

The combined multi-line terminal save check returned incomplete output, so the
final package command was rerun standalone and followed by an explicit saved-state
hash assertion. The complete command output and refreshed record, not the ambiguous
terminal output, establish the final package pass.

The package record is timestamped `2026-09-07T20:09:06.315Z`, corresponding to
2026-09-08 locally (UTC+05:30). Final artifacts:

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `release/Pocket-Cascade-1.0.0-win-x64-portable.exe` | 98,994,829 | `d8508a3ba72de668780fa5b61df274e7597e86c94decfe480a1051f1fd02f901` |
| `release/win-unpacked/Pocket Cascade.exe` | 235,782,656 | `a1db611055ef603817a342586a0fd5efbbac1e80bc7050051d9f37c54357f8f6` |

Current evidence is in [VERIFICATION.md](VERIFICATION.md) and the machine-readable
[package record](../artifacts/release/verification.json). The original sixteen-run
balance report was retained, not regenerated or overwritten with a quick sample.
Automated tests and screenshots do not establish human enjoyment, physical audio
comfort, controller hardware, real Steam/Cloud behavior, or Deck certification.

## H012 - 2026-09-08 - Priorities for Fun and Sales Appeal

### User Question and Scope

The user asked which current open items are most important for making the game
more fun and a better seller. This is a prioritization question, not approval to
implement deferred features, retune balance, select a theme, or release the game.

Reviewed the current tracker, H003 competitor findings, H010 player-save and
difficulty discussion, H011 delivery, and the release checklist. No fresh market
research, sales estimates, player-save inspection, or gameplay experiments were
performed. The commercial recommendations are hypotheses, not measured effects.

### Recommended Order and Trade-offs

1. **D09: sustained fun and meaningful decisions.** Highest gameplay priority.
  The user's late-game ease report and earlier legal-policy results suggest
   that a strong learned route can outgrow the need for interesting choices.
  Repetition is a design risk to test, not a separately measured playtest result.
   Test alternative build incentives and contract decisions alongside multiplier
   availability/cost and reward/capacity growth. Do not solve it through blanket
   target increases, adaptive quotas, randomized learned routes, or removal of
   earned power. Preserve the opening, where weaker policies already stalled.
2. **D03: recognizable identity and a clear reason to choose this game.** Highest
   sales-facing design priority, paired with a distinctive gameplay promise.
   H003 already identified substantial overlap with Ballionaire and other games.
   A coherent player role, machine, and progression could make real screenshots
   and short gameplay clips easier to recognize and understand. Decorative
   wallpaper alone will not create a differentiated game. The inventor workshop
   remains one candidate, not a selected theme or a guaranteed commercial winner.
3. **D01: memorable payoff and replay.** Explore an authored culmination and
   reasons to build another machine, with optional mastery contracts as one
   possible direction. More spectacle should reinforce readable cause and effect;
   hundreds/thousands of tokens are not an assumed solution. Any increased limits
   still need physics, performance, audio, and earned-value accounting review.
4. **D06: named workshops to support experimentation.** Preserving a favorite
   machine while trying another would be easier than manual JSON export and
   replacement of the one current machine. Coordinate eventual storage choices
   with D04. This is a support feature, not the primary sales hook.

Other items remain important at different stages:

- **D07** is a small pacing/discoverability improvement that could run alongside
  larger design work after approval. It exposes existing 1x/2x/4x controls, not a
  new speed mechanic or a substitute for fixing repetition.
- **D04** belongs on the release-readiness track. Protect player progress and
  resolve Steam account, offline, and conflict behavior before shipping or
  promising Cloud. Local save tests do not establish real Cloud behavior.
- **D02** should follow an actual endgame need for more routing possibilities.
  The observed machine already had unused capacity; more space alone may compound
  the current balance issue and introduce readability/zoom costs.
- **D05** is lower priority than the core loop, payoff, and identity. Continuous
  music and stronger physical feedback already shipped; dedicated compositions
  can refine the chosen experience later.

### Proposed Next Investigation

Run a small qualitative playtest with both newcomers and genre-experienced
players. Observe opening comprehension and stalls, then later decisions, when
rewiring stops feeling useful, repetition, and voluntary replay. Compare possible
identities using real gameplay rather than treating attractive concept art as
proof of the product. Let the findings select a small D09/D01 prototype and a D03
direction before funding a broad board/content/art expansion. No playtest has run
or been scheduled, and no prototype is approved in this exchange.

Human testing is already a release gate, even though it is not a numbered D item.
A small qualitative sample can identify problems and improve the next hypothesis;
it cannot establish sales, conversion, retention rates, or an appropriate price.

Only this history and the tracker recommendation were changed. All deferred
statuses remain unchanged; no game code, saves, balance values/reports, assets, or
packages were modified. No runtime suite was rerun for this discussion-only turn;
validation is scoped to documentation links, history numbering, and preservation
of the current item statuses.

## H013 - 2026-09-08 - D09 Discussion Within a No-cost Budget

### User Constraints and Approval Boundary

The user said they have no way to arrange playtests and no money for "stalls etc."
They agreed that the main focus should be D09, D03, then D01, in that order, and
asked to begin discussing D09 with suggestions that would not break existing
behavior. They explicitly said: "Let's discuss first. No change unless I say for
these."

This approves the priority order and discussion, not a balance patch, prototype,
theme, or endgame implementation. Paid testing, events, or outside recruitment are
not prerequisites for this next design step. Existing feedback and the offline
test infrastructure provide a no-cost starting point, but cannot establish human
enjoyment or predict sales. H012's proposed outside playtest is unavailable for now;
it was not performed and is not treated as a blocking requirement to discuss D09.

### Read-only Findings

Read the current tracker/history and the local controlling
[content.ts](../src/game/content.ts) and [engine.ts](../src/game/engine.ts).

- `chooseParts` selects unlocked kinds using the stage and seeded shuffle,
  preserving a newly unlocked kind when applicable. It does not inspect how many
  copies the player owns. Both free choices and paid stock use this helper.
- `makeOffers` uses the fixed `PARTS[kind].price`: Doubler 5 credits, Crown 8.
  Further copies do not become more expensive because the player already owns
  several. `claimPart` can add another free copy from its offered choices.
- Completion pays the commission reward plus bounded spare-launch and excess
  bonuses. Existing paid stock, a free choice in the shop, power upgrades, and
  capacity progression can all strengthen the same persistent machine.
- Therefore changing only shop prices would leave the free-duplicate route
  intact. This is a structural observation, not proof that any particular new
  price or gift distribution is balanced or enjoyable.

No current player save was opened or changed in this turn. The actual-save
observations and limitations remain those recorded in H010/H011.

### Proposed First Experiment - Not Selected

Investigate how later duplicate power is acquired before changing what an owned
part does. Evaluate two small candidates separately:

1. After a protected opening, bias free choices gently toward less-owned unlocked
   kinds while keeping meaningful choice and the current new-unlock guarantee.
   Do not replace one compulsory gift with another or make a needed piece
   categorically unavailable.
2. Keep opening prices unchanged, then consider modest premiums for later copies
   of repeated multipliers such as Doubler/Crown. Count both installed and spare
   copies, not only the equipped board. The relevant copy thresholds, premium
   amounts, protected opening length, and affected kinds are still undecided.

These proposals could create a choice between another familiar multiplier and a
different improvement. They could also merely delay growth, make gifts less useful,
or transfer dominance to Echo/another build. Those are risks to check, not reasons
to declare the proposals successful before an experiment. Do not apply both
candidates at once before understanding their separate effects.

### Compatibility Requirements and Limits

- If a candidate is later approved, new balance rules would apply only to newly
  started workshops. Existing saves and legacy imports would retain their original
  rules through the whole run, including future shops/gifts, not just their current
  board and cash. An explicit backward-compatible run ruleset/version marker and
  tests would be required; this has not been designed or implemented yet.
- Protect the starter setup and opening progression. Do not change physics,
  deterministic launch conditions, part effects, targets, five-launch budgets,
  accounting, existing earned power, retry behavior, base rewards, or capacity in
  the first candidate. No hard duplicate cap, hidden diminishing-return effect,
  upkeep charge, or additional payout cap was proposed for that candidate.
- Preserving old rules also means the proposal will not make the user's existing
  strong workshop inherently harder. New-run balancing and challenges for an
  existing strong machine are separate design choices.
- An optional alternative is additive mastery goals, for example meeting the quota
  with fewer installed parts or banking a share through Vault. These would not
  block normal completion or change normal rewards. Prefer non-economic recognition
  so goals do not add more compounding currency; check part prerequisites and
  feasibility. This adds an unapproved goal system, not a numerical repair to old
  balance, and is not required for the first acquisition experiment.

No balance change can be promised risk-free or guaranteed more fun. Compatibility
and rule invariants can be tested; the enjoyment hypothesis remains uncertain.

### Future Checks and Actual Work

Only after explicit approval, compare candidates in isolated test saves against
untouched starting runs using legal, affordable purchases and the existing shared
simulation. Check the protected opening, weak-route stalls, route-aware progression,
ownership, save/import compatibility, and whether a different repetitive strategy
simply replaces the previous one. Keep the full sixteen-run baseline intact; do not
overwrite it with a quick experiment. No broad art work or paid testing is required
for this comparison, and no outside-playtest result is implied by it.

This exchange changes discussion records only: the tracker, this history entry,
and persistent project notes. Game source, saves, balance values/reports, assets,
and packages are untouched. No gameplay test, balance simulation, prototype, or
new market research was performed. Validation is limited to documentation links,
history sequencing, and retaining all deferred implementation statuses.

## H014 - 2026-09-08 - Deferred Post-level Part-selection Dialog

The user is reviewing the D09 suggestions and asked to add an open item because
the part-selection menu after each level is not noticeable enough. They suggested
exploring a dialog with 3-4 choices, similar to reward selection in other roguelites,
at a later time.

Added **D10: Post-level part-selection visibility**, marked **Open: deferred**, in
[OPEN-ITEMS.md](OPEN-ITEMS.md). The dialog is an option to explore, not an approved
implementation. Its timing, dismissal/reopening behavior, and exact choice count
remain undecided. Keep the free reward distinguishable from paid stock; adding an
extra offered choice is a separate reward/balance decision, not just presentation.

The D09 proposals remain under user review and unapproved. The agreed main focus
order of D09, D03, then D01 is unchanged. This request authorizes recording D10 only,
not implementing a dialog or changing UI, reward rules, pricing, balance, or saves.

Only the tracker, history, and persistent project notes were updated. No game code,
save, balance report, asset, or package changed. Validation is scoped to local
documentation links, sequential history IDs, and existing item statuses plus the
new deferred D10; no gameplay tests or simulations were run for this note.

## H015 - 2026-09-08 - Simplifying the D09 Proposal

### User Clarification

The user questioned the need for extra challenges for their existing machine
because the game is not released and, to their knowledge, exists only locally.
They asked for the assistant's view and a clearer explanation of the actual
balance suggestions, which they had not understood. No implementation was approved.

The release checklist and prior delivery records describe a local browser/Windows
candidate, with no Steam upload or public release from this work. This does not
independently establish whether any copy was shared outside the recorded work.

### Correction to the Earlier Recommendation

The assistant agrees that a special challenge system solely for the current test
machine is unnecessary for D09 now. The H013 proposal overcomplicated the current
pre-release situation by recommending permanent old/new balance profiles. That
recommendation is withdrawn as a requirement; it was never implemented or approved.
The tracker is updated while the original H013 discussion is preserved here.

Save safety is a separate concern: an approved future comparison should keep a
recoverable copy of the user's machine and use a separate fresh run to evaluate
progression. How continuing saves adopt any changed rules remains a decision to
make before implementation. The clarification does not authorize a save reset,
deletion, migration, rule change, or loss of owned parts. D01 remains open; setting
aside old-machine challenges does not reject all future endgame goals.

### Explanation of the Two Ideas

The intended target is how easily a machine repeatedly acquires more multiplying
power, not weakening an already owned part. For a simple arithmetic illustration,
a token entering four Doubler hits at 100 would leave at 1,600; another Doubler hit
would make 3,200. This assumes those hits occur in sequence and is not a simulation
or a reconstruction of the player's saved route.

1. **Which free parts appear.** Current choices ignore owned-copy counts. After
  leaving the opening unchanged, gently favor useful unlocked kinds the player
  owns fewer of. For example, a player with four Doublers and no Vault could be
  somewhat more likely to see Vault among the three distinct free choices.
  They still choose one gift; Doubler need not disappear. Do not force diversity,
  claim every missing kind is useful, or confuse this with D10's dialog proposal.
2. **What later duplicate purchases cost.** A Doubler currently costs 5 credits
  irrespective of how many are owned. As an illustration only, later copies
  could cost 7 and then 9 while early prices stay unchanged. Each owned Doubler
  still doubles. The intended decision is whether another familiar multiplier
  is worth its price compared with a different useful improvement. No tax on
  already owned parts, price schedule, starting stage, or copy threshold is chosen.

The two ideas affect different routes to stronger parts: free rewards and paid
purchases. A shop-only price increase would leave free duplicates unaffected.
The earlier suggestion to examine gift variety first and pricing separately is
still a candidate, not approval to implement both. Neither changes targets,
physics, the effect of existing parts, or the choice count in this first proposal.
Any gift weighting is based on owned parts, not recent score, and need not change
repeatable launch conditions.

These ideas might create useful alternatives, but could also give less useful
gifts, merely slow growth, or shift dominance to Echo/another strategy. Lower
scores alone would not establish better balance or fun. Tests after approval
would need to examine early stalls and later choices separately. No numerical
example is a validated tuning value or a guaranteed solution.

### Actual Work

Updated only the tracker, this history, and persistent project notes to clarify
the recommendation and record the explicit correction to H013. No game code,
saves, balance values/reports, assets, or packages changed. No runtime tests,
simulations, new playtests, or outside release checks were performed. Documentation
validation covers links, sequential history IDs, and unchanged implementation
statuses. D09, D03, D01, and D10 still require explicit implementation approval.

## H016 - 2026-09-08 - Text-only Rebuild Handoff

### User Request and Scope

The user asked how to rebuild the current project on another machine when only
some .txt files can be transferred, and which instructions, design, history, and
other material would be needed to match this state. This is a portability request,
not approval to implement the deferred balance, theme, endgame, or reward-dialog
proposals. The latest H015 corrections were read and included in the handoff.

### Approach and Included Material

Explained the difference between reconstructing from prose and restoring actual
source encoded as text. Written design/history alone cannot guarantee matching
physics, UI, artwork, save behavior, or regressions. If full project contents may
be carried in text files, a lossless source snapshot is the reliable option.
Encoding changes the format, not permission to move otherwise restricted data.

Prepared a local three-file kit under the generated handoff directory:

- START-HERE.txt: a copy of [REBUILD-HANDOFF.txt](REBUILD-HANDOFF.txt), with restore,
  install, build, check, and package commands; documentation precedence; current
  behavior and unapproved items; optional player-save transfer; and a starter
  instruction for an agent on the destination machine.
- RESTORE.txt: a copy of the dependency-free
  [text-handoff.cjs](../scripts/text-handoff.cjs) utility. Copy to a .cjs extension
  on the destination and run with Node. Restoration rejects existing destination
  folders, invalid paths, corrupted payloads/files, and name collisions.
- PROJECT-SOURCE.txt: gzip/base64 JSON with original paths, byte sizes, and SHA-256
  checksums. Includes source, native shell, scripts, tests, current original assets,
  public files, all project docs/history, project instructions, the development
  task, dependency lockfile, root configuration/legal files, the original full
  balance report, and selected dated release evidence/screenshots.

The snapshot excludes node_modules, compiled dist, release executables, native and
browser test output, developer caches, global editor/agent configuration, and the
playable personal save. It is a local export only; nothing was uploaded or sent to
another machine. A saved workshop requires a separate deliberate Settings export
and import; a screenshot or source copy does not restore player progress.

### Destination Instructions and Boundaries

Use Windows x64 and preferably the recorded Node 24.15.0 runtime. Install locked
dependencies with npm ci and download Chromium/Electron using the existing tools.
Then run build/unit/browser verification, native tests against the build, packaging,
and actual packaged-launch checks. These need internet for setup/downloads and an
interactive Windows desktop for native checks; normal built gameplay is offline.

Without network access, additional permitted transfers of runtime, dependency,
browser, and packaging files/caches would be needed and could be very large. A few
pages of prose cannot replace them. Rebuilt executable hashes are not guaranteed
to match across environments; source/asset byte identity is a narrower guarantee.

The guide prioritizes current source/tests, OPEN-ITEMS, and the latest history over
older recommendations, and VERIFICATION over stale milestone totals in overview
text. D08 is implemented; D09/D03/D01/D10 remain unapproved. H015's withdrawal of
the permanent dual-balance requirement must not be lost. Historical 246 unit / 60
browser / 12 native passes remain source-machine evidence, not a destination pass.

### Actual Validation

- `node --test scripts/text-handoff.test.cjs`: seven transfer tests passed,
  covering exact text/binary/line-ending restoration, hidden instruction paths,
  overwrite rejection, payload/file corruption, unsafe paths, duplicate or
  colliding names, and detection of later modifications.
- Generated a 139-file snapshot, approximately 11.3 MiB as text. Ran the exported
  RESTORE.txt utility through restore and verify in a newly created temporary
  directory, compared every restored file against the original bytes, and ran all
  seven transfer tests from the restored project. All checks passed; the temporary
  verification directory was removed afterward.
- Checked that dependency/build/output directories and personal save files were
  absent from the manifest. Editor diagnostics reported no new errors in the
  transfer utility, its tests, or the guide.
- The final kit is regenerated and rechecked after the documentation updates so
  it carries this entry as well as the previous history. Documentation checks
  cover links, sequential history numbering, and unchanged implementation statuses.

Added only transfer tooling/tests, the plain-text guide, generated kit, README
link, history, and persistent project notes. No gameplay/native implementation,
game tests, balance values/reports, original assets, player saves, or packaged
executables were changed. No dependency installation, new-machine execution,
gameplay regression run, balance simulation, or release build was performed in
this turn. No Git initialization, branch, or commit was made.

## H017 - 2026-09-08 - Restored Workspace End-to-End Verification

### User Request and Scope

The user restored the project using `C:\Repos\pocket-cascade\handoff` and asked
to make sure it was running end to end, including tests and the complete setup.
Read the history, tracker, handoff instructions, and controlling verification
scripts. This authorized restore/setup validation, not deferred gameplay work.
No balance, theme, endgame, reward-dialog, or Steam/save redesign was approved.

### Setup and Preservation

- Initially neither Node nor npm was available in the terminal, standard install
  locations, or persisted runtime PATH entries. Installed official Node 24.15.0
  Windows x64 for the current user after verifying its published SHA-256, with npm
  11.12.1. Updated the user PATH without administrator elevation or shell-profile
  changes. The current terminal's Ctrl+U binding was corrected to the supported
  PowerShell `BackwardDeleteLine` function after command-entry errors.
- Before generating outputs, the handoff verifier confirmed all 139 restored
  files matched the supplied snapshot. `npm ci` installed the exact lockfile and
  reported zero known vulnerabilities. No dependency upgrades or audit fixes were
  applied. Installed Playwright Chromium and the locked Electron runtime.
- The existing VS Code Play task could not find npm because the already-running
  editor retained its old PATH. Started a persistent local Vite server using the
  explicit installed Node executable, without adding machine-specific paths to
  the project task. Restarting the editor and rechecking the normal task remains
  R02; the game is already usable at http://127.0.0.1:5173/.
- A final hash check confirmed 74 implementation/test files, package manifests,
  lockfile, and original balance reports still matched the handoff. The game
  required no source fixes. The supplied handoff remains the original snapshot;
  it was not regenerated to include this new verification history.

### Actual Verification

| Check | New-machine outcome |
| --- | --- |
| Transfer utility | All 7 `node --test scripts/text-handoff.test.cjs` cases passed. |
| Production build | `npm run build` passed TypeScript and Vite compilation. Only the documented theme-script and Zod annotation notices appeared. |
| Unit suite | `npm test`: 246 tests passed across 13 files. |
| Browser suite | `npm run test:e2e`: 60 passed, zero failed/flaky/skipped, including the complete campaign. The saved HTML report confirms the totals; terminal progress alone was not used as a completed-pass claim. |
| Native suite | `npm run test:desktop`: the full 12-test production Electron suite passed with temporary test saves. |
| Full balance script | Ran all four policies and four seeds through the existing `scripts/balance.ts` using `tsx` in a temporary working directory. All 16 run records exactly match the original baseline: 14 wins, beginner seeds 1 and 42 stalled, at most four tokens, zero timeouts, and safe integer scores. |
| Windows packaging | `npm run package:win` rebuilt the portable and unpacked outputs, regenerated original icons and twelve-component license notices, and rebuilt the renderer. |
| Actual packaged launches | Invoked the existing `scripts/verify-package.mjs` with a save-backup/preservation guard. Both real executables passed painted-cabinet, native-save, CSP, renderer-isolation, AppID-0, and save-aware shutdown checks. |
| Live app and editor | No editor diagnostics. Inspected fresh 1920x1080 and 320px browser captures and the live cabinet. The persistent server reloads with 46 sockets, ready saving, an enabled launch control, loaded fonts/images, and no horizontal overflow in the inspected live viewport. |

The complete fresh balance reports are stored separately under
[artifacts/balance/restored-2026-09-08](../artifacts/balance/restored-2026-09-08/report.json).
The original full reports remain byte-identical; the quick overwrite mode was
not used. The two beginner stalls are reproduced historical balance limitations,
not new restore failures or permission to retune D09.

No ordinary native player-save folder existed before packaged testing. The guard
therefore needed no backup, and the launchers initialized a fresh version-1
workshop without playing. No comparison against the source player's personal
machine is claimed: that save was deliberately excluded from the handoff. This
outcome is recorded in
[restore-save-check.json](../artifacts/release/restore-save-check.json).

Fresh package evidence is timestamped `2026-09-08T17:12:20.498Z` in
[verification.json](../artifacts/release/verification.json). Portable SHA-256:
`0b14bdaa845abdd7690f9d4d31fa7ddfea3bbee72b3a7dfb44cb3d02b4e32050`.
Unpacked executable SHA-256:
`a56082753d33d36958b5f105bf0299d9723bcf358e6f28ed4960761ba42e9fd4`.
These destination builds supersede the older executable hashes for local use;
the earlier source-machine history is retained.

### Changes and Remaining Boundaries

Installed local tooling/dependencies and generated build, test, separate balance,
and Windows release outputs. Updated this history, the current verification
document, and the tracker with R01 completed and R02 awaiting editor restart/task
recheck. No Git repository, branch, or commit was created. No player-save reset,
dependency update, or gameplay change was made, and all deferred D-item decisions
remain unchanged.

Steam AppID 0 remains intentionally unconfigured. Real Steam/Cloud/overlay,
physical audio/controllers, Deck/Proton, signing, legal/store approval, and human
enjoyment remain separate release gates. Existing Steam artwork was restored,
not regenerated or uploaded during this verification.

## H018 - 2026-09-09 - Fun-first Balance Recommendations Before Changes

### User Request and Approval Boundary

The user selected balancing from the open items as especially important. They
want difficulty that is neither too hard nor too easy, rewards a correctly built
machine, and above all remains satisfying. They explicitly asked for all
suggestions before changes. This selects D09 for active discussion, not approval
to implement a candidate, change values, run candidate simulations, or alter
saves. Other deferred items remain unapproved, and H015's correction still applies.

### Read-only Investigation

Read the latest history/tracker, current reward, shop, power, retry, and progression
code in [engine.ts](../src/game/engine.ts) and
[content.ts](../src/game/content.ts), the balance policy implementation in
[strategies.ts](../scripts/strategies.ts), and [BALANCE.md](BALANCE.md).
Summarized the existing restored report with a read-only Node command; no new
campaign or candidate simulation was run and no report was overwritten.

- The three route-aware policies completed all 12 sampled campaigns, clearing
  131 of their 144 commissions in one launch: conservative 43/48, optimized
  47/48, and splitter-focused 41/48. The simple policy finished two of four
  campaigns, with seeds 1 and 42 still stalling at commission 8. These are the
  already recorded outcomes, not new tests or measured human difficulty.
- The simple policy already searches all nine lanes; stronger policies evaluate
  many placements. Every policy attempts a global power upgrade whenever it can
  afford one before buying paid parts. Therefore this sample does not establish
  how a typical experimenting player performs or compare alternative shopping
  priorities well enough to prove a mandatory purchase.
- Free selection ignores owned-copy counts and paid prices are flat. Power
  upgrades often add about 50%, similar to later quota growth, while capacity and
  owned parts can grow as well. Upgrades are finite and affordability varies.
  These are plausible interacting causes of automatic progression, not proof of
  which should change.
- The optimized seed-42 report repeats payout 19,388 at commissions 7-9 and
  29,134 at commissions 10-12. The existing report does not record board edits
  or individual purchases, so repeated payout must not be presented as proof
  of an unchanged machine. A prospective frozen-layout/power-only comparison
  could distinguish that explanation from continued useful edits.

### Recommendations, Not Approved Rules

The desired loop is understanding an adjustment, seeing a satisfying improvement,
and encountering another worthwhile choice later. A one-launch win can be the
earned reward; making every commission take more repeated identical launches
would not demonstrate better balance. Do not balance the game to frustrate the
strongest automated search strategy.

Recorded the full ranked proposal in [OPEN-ITEMS.md](OPEN-ITEMS.md):

1. Diagnose the contribution of layout, purchases, and global power separately,
  with bounded local experimentation and varied affordable spending policies.
2. Protect the opening and current retry/free-edit safety; investigate whether
  existing stalls admit understandable recovery with owned parts and legal
  earlier purchases. An uncorrected poor arrangement need not always win.
3. After separate approval, compare a small later-free-gift variety candidate
  against unchanged rules. Preserve three distinct options, the new-unlock
  guarantee, and the possibility of continuing a focused duplicate build.
4. Separately consider modest bounded later-copy prices only for demonstrably
  dominant purchases. Count installed and spare ownership, retain affordable
  early copies, show prices clearly, and watch for merely shifting dominance.
5. In a broader conditional pass, investigate useful contextual alternatives
  through current routing, Relay, Vault, and Crown mechanics before assuming
  that every multiplier needs weakening. No part buffs or nerfs selected.
6. Review late token-power timing/opportunity cost only if a power-only baseline
  identifies it as dominant. Keep purchased upgrades noticeably satisfying.
7. Adjust only a demonstrated target spike or weak checkpoint after the build
  and economy evidence; reject blanket harder targets or reactive quotas.
8. Separately discuss D10 reward visibility, D07 speed discovery, and factual
  observed-cascade feedback. Keep the current three choices unless a separate
  reward change is approved; never reintroduce calculated route advice.
9. Reserve an authored late payoff or distinct routing goals for later D01
  discussion if numerical acquisition changes are insufficient. This does not
  restore the withdrawn old-save challenge proposal or authorize more tokens,
  a larger board, or a new endgame system.

Suggested ordinary/strong-machine launch counts are provisional feel examples,
not hard quotas: roughly two to four for a reasonable evolving machine, one or
two for a strong one, with room for exceptional one-launch clears. The important
criterion is meaningful decisions and visible improvement, not suppressing every
outlier or requiring an exact number of launches.

No hard duplicate caps, diminishing owned-part effects, upkeep, new payout caps,
randomized routes, smaller launch budgets, forced failure, or adaptive punishment
are recommended. Preserve deterministic physics, excess payout as success,
earned-value accounting, free rewiring, current impact/audio feedback, and saves.

### Proposed Evaluation and Actual Work

Future experiments require approval and should change one cause at a time. Keep
baseline reports and recoverable saves; use fresh isolated runs and earned
currency, matched seeds followed by additional seeds, imperfect and route-aware
policies, focused and mixed builds, purchase alternatives, and mistake recovery.
Require the opening to remain unchanged and check for new stalls, fewer useful
choices, inaccessible desired parts, lost big-payout moments, and replacement
dominant builds. Reject a candidate that only lowers scores or prolongs identical
launches. No paid testing or outside recruitment is a prerequisite. Automated
checks protect rules and boundaries, but cannot guarantee that a change is fun.

Updated discussion records only: the tracker date, D09's active-discussion status
and full proposal, and this appended history entry. No implementation approval
was recorded, no numerical tuning values were selected, and no gameplay source,
test, save, report, dependency, asset, or package was changed. R02's editor-task
follow-up was not rechecked and remains open. Documentation validation checks
history order, proposal/approval labels, local links, and unchanged unrelated
tracker decisions. Game tests and balance simulations were not rerun for this
discussion-only exchange.

## H019 - 2026-09-09 - Approved Balance Trial Tested and Not Adopted

### Approval and Scope

The user approved proceeding and explicitly requested tests and experience checks.
This was treated as approval of the preceding recommended first pass: diagnose
progression, then test one small isolated later-gift candidate. It was not approval
for all nine suggestions, changed prices/effects/targets/power, a save reset,
earlier reward changes, a new theme, or endgame systems. Protecting satisfaction
and rejecting a candidate that only adds repetition remained acceptance criteria.

### Implementation and Actual Measurements

Added optional build/shop/collection policies and detached observation hooks to
[scripts/strategies.ts](../scripts/strategies.ts), preserving default behavior.
The new [diagnostic runner](../scripts/balance-diagnostics.ts) records gifts,
purchases, payouts, boards, and actual edits from fresh legal campaign runs.
It compares the four existing policies with frozen layouts, power-only purchases,
limited local edits, stock-first shopping, and limited loss recovery. All policies
remain tests, not an in-game advisor or validated models of human skill.

Ran 88 baseline and 88 candidate campaigns on fixed seeds 1, 42, 2026, 65537, 7,
13, 99, and 2027. The isolated [gift candidate](../scripts/experiments/gift-variety.ts)
keeps the first six shops and first two later choices unchanged, with a 25% gate
to replace the third choice after commissions 7-11 with a less-owned unlocked
kind. Installed and spare ownership both count. Already saved rewards, paid stock,
physics, scores, budgets, final rewards, and After Hours are untouched.

The complete [comparison](../artifacts/balance/experiments/comparison-2026-09-09.json)
records 33 changed offers and 17 changed selected gifts. All completion outcomes
were unchanged, with 87/88 full campaign records identical. Splitter seed 1 needed
16 instead of 15 launches and its best drop fell from 9,276 to 8,043. Later
improving builds did not increase. No new stalls, timeouts, token-bound violations,
or unsafe score integers appeared; all 529 reached stage records through the
protected seventh commission matched exactly. The original sixteen-run report
was reproduced and left intact.

Diagnosis: the simple policy completed 2/8 samples, while each route-aware policy
completed 8/8. Limited-edit policies still stalled. All eight optimized machines
frozen after commission 6 finished without further layout or power changes. This
does not establish human difficulty, but shows why a later-gift change alone can
leave progression unaffected. The full methods and limitations are recorded in
[BALANCE.md](BALANCE.md#d09-first-experiment---2026-09-09).

### Experience Checks and Decision

Ten focused unit tests pass, including baseline equality, detached observations,
bounded edits, deterministic gift changes, ownership counting, and persistence.
An independent browser boundary probe checked 512 later states and 96 early shops
without touching player storage. Two real browser UI cases pass at 1440px and
390px using a shop earned by fresh legal simulated play, then actual controls to
claim a zero-cost Echo, install it, launch, and reload. They check a painted,
changing canvas, exact payout, ownership, currency, and saved choices. Screenshots
were inspected; these are not seven commissions of manual play or physical audio
verification. The examined Echo improves 4,648 to 4,721, while 4,200 was already
attainable. A working reward flow is not proof of more satisfying progression.

**Decision: do not adopt this candidate as a balance fix.** It stays under test
tooling, disconnected from the normal engine, renderer, and packages. Do not make
the bias stronger or change earlier rewards merely to force a positive result.
D09 remains open; the next discussion concerns when a machine becomes effectively
finished and what later decisions remain worthwhile without penalizing earned
power. Further rule/design changes still require approval.

### Workspace and Verification Follow-up

The normal Play task now found npm but failed because PowerShell blocked npm.ps1.
A Windows-only npm.cmd override fixes it without lowering execution policy or
hardcoding an installation path. The ordinary task was successfully run at
http://127.0.0.1:5173/, resolving R02. Added repeatable process tasks for the focused
balance tests, candidate comparison, and browser experience checks. Long-running
terminal output was incomplete, so final reports and independent task results were
used instead of calling partial output a pass.

A hash check confirms all 40 original runtime/native, manifest/lockfile, and
balance-report files are unchanged. No personal save was reset, copied into
artifacts, or replaced; the current handoff remains its original snapshot. No
Git initialization, branch, or commit was made. Native/package checks are not
being represented as rerun in this test-only pass. Real Steam/hardware and all
other deferred D-items remain unchanged.

The full build/unit/browser regression was started with `npm.cmd run verify` after
the focused checks; its final aggregate result is still pending at this point.

Final follow-up: that regression completed successfully. TypeScript/Vite build,
254 unit tests across 14 files, and 62 browser tests passed, with zero failed or
skipped tests and zero flaky browser results. The full browser report includes
the normal campaign, audio, controller, save/restart/inventory, and layout cases
as well as the two isolated candidate-fixture cases. The terminal truncated the
first unit summary; a separate full JSON-report run confirmed 254/254 again,
starting at `2026-09-09T18:40:47.927Z`, and is retained with the experiment evidence.
The session-only Ctrl+U key binding was corrected again when command entry included
an unexpected control character; no system execution policy was changed.
Final documentation validation checks local links, numbered history, explicit
non-adoption, actual test counts, unchanged runtime/baseline hashes, and preserved
unrelated open-item decisions. The ordinary game remains running on port 5173.

## H020 - 2026-09-10 - Reported Low-zoom Layout Issue

- **Request / observation:** The user reports that at very low zoom the main
  game cabinet becomes very small while the text remains large, and asks to add
  this to the open items. Their screenshot shows a tiny cabinet, comparatively
  large labels, and overlapping launcher/nearby controls in an embedded browser
  pane above the editor terminal.
- **Discussion / decision:** Added D11, marked **Open: reported; deferred**.
  The exact zoom mechanism/percentage and viewport height are not established;
  independently reproduce the state before attributing it to zoom, short-pane
  sizing, or a specific implementation. The intended outcome is a usable cabinet
  with coherent relative sizing or responsive reflow, no control overlap, and
  aligned socket targets. Earlier normal-viewport passes do not verify this case.
- **Changes:** Tracker and history only. This request records the issue; it does
  not approve implementing a layout fix, changing physical board geometry, or
  revisiting gameplay rules. Existing P06 evidence and all other item decisions,
  including the unadopted D09 balance candidate, remain unchanged.
- **Verification:** Reviewed the supplied screenshot and report; no independent
  browser reproduction, gameplay test, build, or package run was performed.
  Validation is limited to the documentation entry, IDs, status, and local links.
- **Open follow-up:** D11 reproduction and a separately approved layout fix with
  low-zoom/short-viewport checks. No zoom percentage or root cause is claimed.

## H021 - 2026-09-10 - Authorized Local Git Setup and Secret Exclusions

- **Request / authorization:** The user explicitly asked to create a Git
  repository and keep sensitive material and installed packages such as
  node_modules out of commits. This authorizes local initialization; it does not
  authorize a first commit, hosted repository, push, or publication. Earlier
  no-initialization decisions remain historical and are superseded only for this
  requested setup. No unrelated gameplay or deferred-item work was authorized.
- **Tooling:** Git was not available in the terminal or standard installation
  locations. Installed the official MinGit 2.55.0.windows.5 and Gitleaks 8.30.1
  Windows x64 archives into per-user program directories after matching their
  published SHA-256 digests. Git was added to the current and user PATH. No
  administrator privileges, execution-policy change, account setup, credential
  entry, or upload of project contents was used.
- **Repository:** Checked for existing/ancestor Git metadata and Git path/index
  environment overrides before running `git init --initial-branch=main` in this
  workspace. The repository is local only, with an empty index, no commits, and
  no remotes. No separate feature branch was created, and no user files were
  removed to prepare the repository.
- **Exclusions:** Added [.gitignore](../.gitignore) for node_modules, builds and
  release packages, caches, logs, generated reports/captures, native test output,
  encoded handoff bundles, environment/credential files, signing keys, local
  editor preferences, and player save/export names. Source, tests, docs, original
  artwork, package.json/package-lock.json, the portable editor tasks, and the
  original balance JSON/Markdown remain eligible. Generated evidence remains
  available locally; most artifacts are intentionally not versioned.
- **Secret review:** Scanned a temporary local snapshot of exactly Git's
  non-ignored candidate files with Gitleaks and redacted reports. The first scan
  flagged the public browser-storage identifier in source and its documentation,
  not an authentication credential. Verified both locations and added
  [.gitleaks.toml](../.gitleaks.toml), extending every default rule with an
  exact-secret-value exception only for the two public storage identifiers.
  No entire file, directory, or generic credential rule was suppressed.
- **Validation:** All 30 representative exclusion checks and 13 required-file
  checks passed with `git check-ignore --no-index`. All 142 eligible files passed
  the subsequent secret scan. A non-working synthetic token created only in a
  temporary directory was detected by the default GitHub-token rule; temporary
  copies were removed afterward. `git add --dry-run --all` agreed with the
  142-file candidate list and left the index empty. Confirmed no refs/commits
  or remotes. The sanitized scan record is local under the ignored
  artifacts/security directory. No game tests, dependency upgrades, save changes,
  or new build/package launches were needed for this Git-only setup.
- **Limits / follow-up:** No pre-commit hook or CI secret-scanning gate was added.
  Ignore rules can be bypassed by forced adds and do not detect a secret inserted
  into an ordinary source file; future changes still need review and scanning.
  A clean scan is not a guarantee against every possible secret format or
  sensitive content in images. Commits and remote creation/publishing remain
  separate actions requiring permission. An already-open editor or terminal may
  need reopening to discover the newly installed Git through its updated PATH.
  R03 is resolved; D09, D11, and all other unrelated decisions remain unchanged.

## H022 - 2026-09-10 - Authorized Initial Commit and Origin Publication

- **Request / authorization:** The user explicitly requested a commit and creation
  of a repository at origin, with a normal short commit message rather than a
  lengthy generated description. This now authorizes committing and publishing
  the previously prepared source repository; H021's earlier no-commit/no-remote
  boundary is superseded for this request. No gameplay or deferred work changes
  were requested.
- **Selected approach:** Use the single-line message `Initial commit`. Default
  to a private GitHub repository named pocket-cascade in the account authenticated
  by the user. Do not change the repository to public, overwrite an existing
  remote, force-push, or bypass secret/exclusion checks.
- **Observed prerequisites:** The local repository is still on main with no
  commits, remotes, or configured author name/email. GitHub CLI and its login were
  absent. Installed official GitHub CLI 2.100.0 into a per-user directory after
  validating the archive's published SHA-256, and added it to the user PATH.
  No administrator privileges, account creation, credential disclosure, or
  execution-policy changes were used.
- **Current work / validation boundary:** Prepare and scan the exact staged
  files with the existing Gitleaks configuration before committing. Browser-based
  GitHub authentication and the resulting account are still needed for identity,
  remote creation, and push. No successful scan of this final index, completed
  commit, hosted repository, or push is claimed by this preparatory entry.
  R04 remains open until those outcomes are verified. Earlier test results remain
  dated evidence; no game tests or build changes are needed for this Git workflow.

Follow-up before authentication completes: staged 142 normal project files and
checked each against the ignore rules. Scanned their exact Git blobs with Gitleaks
8.30.1 and the existing narrow public-storage-identifier exception; zero findings.
The sanitized local record is artifacts/security/staged-scan.json. The user
confirmed that GitHub CLI may authenticate Git, then elected to handle the browser
authorization and remaining prompts directly. No password, token, or device code
is recorded here. Remote creation and author configuration still await confirmed
login. These subsequent documentation edits must be restaged and rescanned before
the final commit. No commit or push has been performed at this checkpoint.

## H023 - 2026-09-10 - Preference for Proactive Prerequisite Installation

- **Request / decision:** The user explicitly asked to continue proactively
  installing missing tools and dependencies in future work, rather than leaving
  routine setup to them. Saved this as a cross-workspace personal preference,
  alongside their preference for short, natural commit messages.
- **Boundaries:** Install only prerequisites needed for the authorized task,
  prefer official/trusted sources and verified downloads, and use per-user
  installations where practical. Preserve locked dependencies and avoid unrelated
  upgrades. Costs, privileged or broader system changes, and user-managed secrets
  still require the appropriate approval or direct user action.
- **Changes / validation:** Personal memory and this history entry only. Read
  back the saved preference to verify it. No new installation, gameplay change,
  test run, Git commit, remote creation, or terminal-authentication input was
  performed for this preference request. R04's recorded authorization wait and
  all deferred game decisions are unchanged; these history edits also need
  restaging and scanning when the pending commit proceeds.

## H024 - 2026-09-10 - GitHub Publication and Owner-only Main Exception

- **Request / reversal:** The user repeated the request to commit and create
  origin, adding mandatory personal approval of PRs to main and no direct pushes.
  Before completion, they explicitly clarified that their own account should be
  able to push directly to main for now. This supersedes the all-users prohibition
  only for their authenticated account; other users must still use an approved PR.
  Commit messages remain short and ordinary, starting with `Initial commit`.
- **Authentication / identity:** Confirmed GitHub login as
  Dante-Auditore-da-Firenze, account ID 73032811. Configured the repository-local
  commit author from that account and its GitHub noreply address without changing
  global author settings or reading/disclosing stored credentials.
- **Remote and visibility approval:** Created the originally proposed private
  repository and set origin. GitHub returned HTTP 403 for private-repository
  rules, requiring GitHub Pro or public visibility. Presented the choices to the
  user, who explicitly selected **Make public and enable the rules**. Changed
  only this repository to public; no subscription purchase or plan change was
  made. The repository is
  https://github.com/Dante-Auditore-da-Firenze/pocket-cascade.
- **Configured policy:** Added [.github/CODEOWNERS](../.github/CODEOWNERS) with
  the authenticated owner covering all files, including the ownership/policy
  files themselves. The [PR ruleset](../.github/rulesets/main.json) requires one
  code-owner approval, dismisses stale approvals after new changes, and requires
  review conversations to be resolved. Its only bypass actor is the user above,
  in always mode, allowing their explicitly requested direct main pushes.
  The separate [history ruleset](../.github/rulesets/main-history.json) blocks
  force pushes and deletion with no bypass actors, including for the owner.
- **Server validation:** GitHub accepted the review ruleset. A repository-lock
  response interrupted creation of the history ruleset after the visibility
  change; inspected existing state and created only the missing rule on retry.
  Both rulesets are active, with IDs 22677836 and 22677944. Read back their rules,
  bypass actors, and effective main-branch rules. GitHub reports the current user
  can always bypass the review rule and can never bypass the history rule.
  No working protection was deleted or weakened during this retry.
- **Publication checkpoint:** Origin and server rules are ready. Final source
  staging/secret scanning, the initial commit, push, and uploaded CODEOWNERS
  validation are the next actions; no completed push is claimed at this checkpoint.
  R04/R05 remain open until these checks finish. No gameplay changes, dependency
  upgrades, game tests, or package runs were made for this Git workflow.
- **Policy limits:** GitHub does not allow a PR author to approve their own PR.
  The user's temporary bypass permits their own direct pushes/merges; it does
  not grant the same exception to other writers. As repository administrator,
  the owner can still deliberately edit or remove repository rules. The stored
  JSON alone is not enforcement; the live GitHub rules are authoritative.

### Completed Publication and Verification

Created `Initial commit`, hash `8cc531d6ae3caa23f831f32692520227c2403c6f`, with
145 files after scanning the exact staged blobs with Gitleaks. Zero findings;
the committed tree exactly matched the scanned tree. Dependencies, builds,
generated reports, handoff bundles, likely secret files, and player saves remained
excluded. No package/runtime source changes were made for this setup.

The first push attempts did not create a remote branch because Windows quoting
split a manually specified GitHub CLI credential-helper path. Used the supported
`gh auth setup-git --hostname github.com` command, then a plain, non-forced
`git push --set-upstream origin main`. It succeeded without disabling either
ruleset. GitHub authentication is handled by its credential helper; no token was
placed in the remote URL, repository files, or this history.

Verified the remote main SHA equals the local commit, main is the default branch,
and the local upstream is origin/main. GitHub reports main protected and no
CODEOWNERS errors, with the expected all-files owner present in the published
file. Read both active rulesets back again, confirming the sole user-specific PR
bypass and the absence of any history-protection bypass. Effective main rules
include pull requests, non-fast-forward prevention, and deletion prevention.
No other-account push, force-push, or branch-deletion probe was attempted; the
cross-user restriction is established by the live rule configuration, not a claim
of using another person's credentials.

R04 and R05 are resolved. The public visibility and temporary owner-only direct
push exception reflect the user's explicit latest choices, replacing the earlier
private/no-bypass defaults. No subscription upgrade, collaborators, account,
automatic PR approval, or new gameplay work was introduced. Generated local
verification records remain in the ignored artifacts/security directory.