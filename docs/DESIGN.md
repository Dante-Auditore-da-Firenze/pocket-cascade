# Pocket Cascade Design

## Product Boundary

Pocket Cascade is a compact, active combo builder: arrange a small machine, choose a launch lane, watch a repeatable physical cascade, and spend earned Workshop credits on improvements. The implemented game uses **minimum commission payouts**, not the exact-total tray orders in the original research concept. Excess output is welcome; it never fails a commission.

The scope is one custom Canvas2D cabinet in an original clockwork workshop, ten part types, one behavior-changing tuning per type, twelve authored commissions, a finite power track, a UTC daily seed, and bounded After Hours capacity progression. It is not an idle-income game, an online competition, or a real-money system. This remains an unreleased prototype, not proof of commercial readiness.

## Current Rules

H040 (2026-09-12) adopts interdependent generators, amplifiers, banking, and
branch-convergence parts as normal saved gameplay. The former temporary trial
entry is removed; its URL query no longer selects another ruleset. Historical
experiment reports remain in [BALANCE.md](BALANCE.md), separate from current
measurements. Fixed bonus sockets and compact-checkpoint experiments are not
active player mechanics. No permanent old/new balance profiles are maintained.

## Play Loop

1. Arrange the machine and choose one of nine launch lanes. New runs start at lane 1 before any play; subsequent aiming, launches, retries, restarts, and commission advances retain the chosen lane. Saved runs and practice entries keep their recorded aim. The starting machine has three Mints and a Doubler installed, with a Fork on the worktable.
2. Launch from a five-drop commission budget. Parts change token value or route; the outer collectors pay x1 and the center pays x2, subject to the numeric cap.
3. Reach the minimum target to collect Workshop credits. Unused drops and excess payout each add a bounded bonus. Unspent score does not carry into the next commission.
4. Choose one complimentary part, tune a matching owned part, or take two credits. Buy optional stock, token power, or targeted tuning; fuse matching spares and rearrange before advancing. The first eleven shops lead to the next commission; the twelfth ends the campaign.
5. If five drops are insufficient, **Retry commission** retains the machine, purchases, and current difficulty. **Retry with +10% help** explicitly increases base value, capped at +30% for this commission. Attempts and accepted help are separate; advancing resets both. Loss review never automatically lowers targets. The initial New Workshop relaxed option still lowers targets by 35%; existing assisted saves retain their setting, and Daily cannot start relaxed.

Placement, swapping, returning installed parts to the worktable, and rotation are free while ready, shopping, or recovering from a loss. Capacity is 7/8/9/9/9/10/10/11/11/12/12/13 over the campaign. After Hours opens 14 slots, then 15/16/17/18 at After Hours 4/7/10/13. The physical cabinet still has 46 sockets and unchanged geometry.

The installed/capacity indicator sits beside the board toolbar across viewport sizes. The shop still uses the completed commission's cap: at 7/7, swap or return an installed part, with spares retained. Its notice explicitly says **Next level: 8 installed parts. 1 extra space opens when you advance.** This is clarification, not a capacity, board-dimension, or geometry increase.

The worktable and installed parts share an 80-part ownership limit. A spare salvages for one credit only in the shop; the last Mint, Relay, or Kicker cannot be sold. An older generatorless inventory may still sell non-generators to fund recovery. At full storage, the reward dialog disables new copies but still offers eligible tuning or two credits; it never adds beyond the limit.

`PartInventory` stays visible above the shop and other editing views without a tab change; it is disabled during a drop. Equivalent spares share one selection button with an xN quantity badge. Tuned/untuned copies are separate, as are left/right Forks and Kickers. Saved IDs remain individual; quantity is separate from the scoring glyph and tuning mark.

Grouping is presentation-only: the version-1 save still contains every individual part ID and direction. The currently selected copy is retained within its group, including a newly bought/free copy; otherwise selecting a group picks its first available member. Placing or salvaging affects one copy, returning a part increases its group count, and rotating a directional copy changes only its own group. Placement keeps the existing deselection behavior. Paid token power is labeled **All tokens. No part to place.** It upgrades base value, not inventory.

**Restart level** uses the rotate-arrow toolbar button or the menu. `canRestartCommission` permits only `ready`, `dropping`, and `lost`; `restartCommission` returns to `ready` with score 0, five launches, and null `lastDrop`/`activeDrop`. It preserves the board, bench, credits, upgrades, seed, stage, assisted flag, retries, cumulative run totals, and profile. The live simulation is disposed without a later payout. Restart grants no reward or additional retry bonus and is disabled in `review`, `shop`, and `won` to prevent collecting twice.

**New workshop**, the plus toolbar control or menu entry, opens the existing confirmation and seed dialog. Confirmation starts level 1 with the selected seed/options while preserving profile and settings; cancellation leaves the current machine intact. It is not a same-level restart or an additional save slot.

Undo/redo stores up to 30 machine edits. It does not rewind launches or trades. Launching, restarting, trading, collecting, advancing, starting a new run, and importing clear edit history. Tuning, fusion, and salvage are trades: undo cannot recover a consumed spare, undo paid tuning, or duplicate credits.

The player-facing currency is **Workshop credits**, shown in a Lucide Ticket-icon wallet with earned/spent receipts. Internal `RunState.brass`, economy rules, and prices are unchanged. The one free gift is separate from paid stock, costs nothing to claim, and its selector disappears once claimed. Spending on stock or power remains optional.

Collecting opens **Choose a reward**, with three seeded offered kinds, their
effects, and owned counts. **New part** and **Tune owned part** select the reward
mode; tuning identifies a specific installed socket or spare copy. **2 credits
instead** is always available. Only one reward can be claimed. Paid stock stays
separate. Inspect/Escape/controller Back dismisses without claiming and focuses
the reopen control. Pending reload/import and After Hours use the same flow.

## Recovery and Practice

H047 (2026-09-23) implements the approved recovery policy without a runtime
solver or an automatic impossible-state verdict. Save data records the latest
earned shop before reward selection/spending. Restore last shop confirms the
discarded decisions and clones that exact run state, including IDs, tuning,
currency, power, reward status, offers, seed, and run totals. The profile keeps
its actual earned history; rollback does not award points or completion again.
Restore is available in the same shop or the immediately following unfinished
commission, not during a drop or after completing that next commission.
Buying, fusing, salvaging, rerolling, and reclaiming after restoration cannot
accumulate resources across rollbacks. No missing legacy checkpoint is invented.
Rollback and the last-generator guard reduce avoidable dead ends but do not prove
all inventories solvable; New workshop remains a confirmed player-controlled exit.

`retries` counts Retry actions; optional `retryHelp` records accepted help from
zero to three. Absent legacy help derives from the old capped retry count until
an explicit Retry writes it. Restart keeps both; next commission resets them.
The optional help command remains available from the first loss and gains visual
emphasis after repeated retries, without being silently enabled.

Practice entry snapshots are captured at a fresh workshop and each shop advance,
before commission edits. They retain that entry's actual inventory, power, lane,
and difficulty. Save validation bounds them to 24: up to twelve campaign entries
and twelve most recent After Hours entries. They contain no nested checkpoints.
The practice chooser only lists recorded stages; old saves start recording as
play continues. A new workshop clears the prior workshop's entry collection.
Restoring a shop preserves reached entries, then replaces a re-entered stage with
its new entry build if the player changes purchases.

Practice lives in a separate React run state, identified by an explicit practice
flag. Engine collection and save progress reject that flag; the persisted campaign
schema rejects a practice run. Tutorial/achievement updates are suppressed, no
shop/reward progression is exposed, and export/quit always use the campaign save.
Changing settings can persist preferences but not the practice run. Exit, reload,
or closing during a practice drop resumes the campaign without settling practice
points. Shared simulation/rendering and manual arrangement still apply.

## Part Tuning

An untuned part can be tuned once through a matching offered reward, a paid shop
action costing its part price plus three credits, or fusion. Fusion is available
between launches and consumes one matching untuned spare; the target retains its
ID, socket, and direction. It is not an unlimited numerical upgrade ladder.

| Part | Tuning | Added Behavior |
| --- | --- | --- |
| Mint | Dynamo | Produces two charge instead of one. |
| Doubler | Crossfeed | After a successful double, transfers one charge to another live token that is not full. |
| Fork | Starter | Its new child gets one extra charge after the existing charge is divided. |
| Kicker | Tollgate | Also banks one base value. |
| Relay | Network | Adds one extra charge per two occupied neighbors, still capped at three. |
| Vault | Capacitor | Retains one charge after its deposit. |
| Echo | Recovery | Restores one charge after a successful repeat. |
| Crown | Insurance | Without two charge, banks one base value per kind hit instead. |
| Dividend | Reinvest | A nonempty cash-out also adds two charge. |
| Junction | Exchange | Third and fourth distinct arrivals also bank their own entry value. |

## Quick Guide

The nonblocking guide follows **place, launch, collect, gift, spend**. Players may skip it or replay it from Settings. Actionable highlights identify controls, not a calculated best lane or layout; the guide grants no extra currency and does not complete actions for the player.

Calculated advisor code and its UI/tests were removed on 2026-09-07 by user decision. No route suggestions remain. That removal did not retune the economy or assistance values; the later approved loss-flow follow-up removed the mid-run relaxed choice as described above.

The guide uses short action labels and keeps points separate from spendable
credits. Routine menu/result text is literal; redundant commission subtitles,
installed-part statistics, idle diagrams, and promotional slogans are no longer
shown. Essential prices, effects, launch counts, retry limits, and the optional
manual remain available. Reward buttons announce their effect and owned count.

## Parts

Effects use the current launch's base value. Numeric additions, multiplications, and payouts are rounded and bounded by the simulation's `money()` helper.

| Part | Effect | First Availability |
| --- | --- | --- |
| Mint | Adds 140% base and one charge. | Start |
| Doubler | Spends one charge to double current value; otherwise no multiplication. | Start |
| Fork | Adds a 75%-value child, dividing charge/reserves between branches. At depth limit, adds one charge. | Start |
| Kicker | Adds base value and one charge; kicks left/right with an upward component. | Shop after commission 2 |
| Relay | Adds base value times one plus occupied neighbors, and one charge. | Shop after commission 3 |
| Vault | Banks current value times `0.5 + 0.25 * charge`, then spends all charge. Token value is retained. | Shop after commission 4 |
| Dividend | Adds twice the token's unused deposit reserve, then consumes that reserve. Banked points remain earned. | Shop after commission 5 |
| Echo | Repeats the remembered addition/multiplier once; a multiplier costs one charge. Clears memory. | Shop after commission 6 |
| Junction | Adds one charge. The second distinct token at this socket banks the sum of both entry values once per launch. | Shop after commission 7 |
| Crown | Spends two charge for `1 + 0.4 * distinct kinds hit`, including itself. | Shop after commission 8 |

Tokens start with zero charge and hold at most three. Mint/Relay and successful
Doubler/Crown record an effect for Echo; unsupported amplifiers clear it. Echo
never repeats splits, banking, routing, charge generation, or another Echo.
Dividend and Junction do not rewrite Echo memory. A deposit creates both earned
points and a token reserve; consuming the latter never subtracts earned points.
Junction never delays or removes a token. Its shared arrival state and all token
charge/reserves reset each launch. Fork keeps value creation separate from
resource division, so charge/reserves are not duplicated for free.

Definitions, descriptions, prices, unlocks, and achievement names live in [src/game/content.ts](../src/game/content.ts); effects are computed in [src/game/simulation.ts](../src/game/simulation.ts). Changes to either must keep the other truthful.

## Determinism and Limits

- Matter.js advances at a fixed **120 Hz**: `1000 / 120` milliseconds per step. Rendering speed is not a variable physics timestep.
- Every launch uses the run's unchanged seed. The same board, lane, base value, seed, and runtime should reproduce the same event trace; merely advancing a commission or repeating a launch does not reroll its physics. Shop choices use separate seed/stage offsets.
- Collision effects are processed in stable token/socket order. Reproducibility is a same-build contract, not a guarantee across future Matter.js versions or untested platforms.
- Each equipped socket triggers at most once per token per launch. Children inherit visited sockets, encountered part kinds, and the remembered Echo effect, so a split does not reset earlier triggers.
- Forks allow two generations and at most **four tokens created per launch**. Tokens collide with the cabinet and pegs, not each other. Depth-limited hits add charge instead of another token; Junction convergence is a scoring interaction, not a physics merge.
- Slow tokens receive a deterministic nudge. At **1,440 ticks / 12 simulated seconds**, any remaining token pays into the collector corresponding to its current horizontal position. Already banked points remain; the safety timeout does not delete points. The result records `timedOut`.
- `MAX_VALUE` is **1,000,000,000,000**. It caps individual token values and bounded contributions, including collector payouts; the total launch score can include several contributions. This is a finite numeric safety limit, not unlimited growth. Current part-effect labels do not indicate saturation, a remaining readability concern at extreme values.
- Visual effects are bounded to **160 particles** and **10 floating labels**. Reducing or dropping visual effects must not change simulation scoring.
- Physical-impact events and audio voice limits are presentation-only; neither changes `DropResult` or earned-value accounting.
- Accounting is `total = banked + left collector + center collector + right collector`. The engine rejects inconsistent settled totals.

See [src/game/model.ts](../src/game/model.ts) for board geometry and limits, and [docs/BALANCE.md](BALANCE.md) for progression and measured results.

## Modes and Progression

**Workshop:** twelve authored commissions, deterministic seed entry, standard or relaxed targets. Numeric seeds up to an unsigned 32-bit value are accepted directly; other nonempty seed text is hashed. Blank input creates a new seed.

**Daily:** the same twelve-commission rules with a seed derived from the current UTC date. All players using that date and build receive the same seed. Relaxed targets are disabled, while the normal retry bonus remains available. Completion is recorded locally; there is no leaderboard, server verification, prize, or anti-cheat claim.

**After Hours:** optional continuation with five drops, 15 base reward credits,
and targets `min(1e9, round(75000 * 1.3 ** n))`, starting at n=1. Slot milestones
at After Hours 1/4/7/10/13 grant capacities 14/15/16/17/18. The next milestone is
displayed. New parts, tuning, and credits remain reward choices; this is bounded
progression, not a promise of infinite new content or endlessly useful upgrades.

Ten achievements and a bounded local completion history track milestones. Native Steam unlocks are attempted only when the desktop integration reports availability; local achievements remain useful without Steam.

## State and Persistence

The engine owns explicit `ready`, `dropping`, `review`, `shop`, `lost`, and `won` phases. A drop consumes one launch when it starts; only its validated settlement changes commission score. A shop must resolve its complimentary reward before advancing. Loss retries retain their existing base-value assistance, which resets on the next commission; quick restarts do not increase it. Relaxed assistance chosen at Workshop creation, or retained from an assisted save, remains enabled for that run. There is no mid-run relaxed transition or `relaxCommission` helper.

The version-1 Zod schema in [src/game/save.ts](../src/game/save.ts) checks ranges, part identities, socket validity, capacity, phase consistency, and payout accounting. Unsupported versions and malformed imports are rejected; there is no general migration promise for unknown future formats. Loading an interrupted `dropping` state refunds the consumed launch and returns to ready rather than guessing partial results.

Guide progress uses optional `tutorialStep` in the version-1 `Profile`. Legacy profiles remain compatible and `seenTutorial` is preserved; there is no save-version bump. Settings now accept optional literal `fullscreenPreferenceVersion: 1`. Fresh saves set that marker and `fullscreen: true`, with reduced motion off; explicitly saved reduced-motion `true` remains respected.

Desktop load/import applies `migrateDesktopSave`: an unmarked legacy `true` or `false` becomes fullscreen once and receives the marker, then autosaves. Intentional old windowed choices cannot be distinguished from the old false default; overriding both once is explicitly user-authorized. A marked save honors its boolean, so later windowed choices persist. This migration changes only fullscreen and its marker, not other settings, the run, currency, or profile. `parseSave` and browser-only loading do not apply it; interrupted-drop recovery is a separate existing behavior.

Browser storage maintains a primary and previous-valid backup. The native shell serializes writes, flushes temporary files, atomically replaces the primary, and retains a valid backup. The renderer finishes loading and validating before its first autosave; recovery and write failures are visible. Settings export uses a browser JSON download or the native validated `exportSave` dialog, not a renderer-selected filesystem path. Import validates the complete game schema before replacing the current machine.

There is one active saved machine per storage profile. Confirming a new run replaces it; export first when retaining a separate machine matters. Profile history stores seeds and results, not complete restorable workshops. Named save slots are unimplemented and deferred as D06; autosave/export is unchanged, with no workshop database or Steam Cloud redesign. Browser origins have separate storage, and browser saves are not Steam Cloud saves. Native storage is per Windows user, not per Steam account. See [docs/STEAM.md](STEAM.md) for paths, security, and Cloud configuration.

## Presentation and Input

The board is a custom Canvas2D scene with an accessible DOM control layer for sockets and tools. Local generated cabinet art and icons provide the visual identity. DM Sans, Barlow Condensed, Lucide icons, and generated icon assets are bundled locally; normal gameplay has no runtime network-asset dependency.

The approved **clockwork workshop** now uses a graphite playing surface in evening
lighting and a pale neutral surface in daylight, with red enamel housing, steel
rails/collectors, and limited brass accents. Interface surfaces and text neutrals
no longer carry the room's green tint. Original day/evening room artwork frames
the cabinet with an arched window, clock, blueprint, tools, lamp, and workbench.
The fixed room layer is decorative, hidden from assistive technology, and cannot
intercept controls. High contrast hides the scenery; narrow layouts increase the
quiet background behind the playable content. There is no countdown mechanic.

H047 separates the original clock hands and connected bench gears into four small
transparent WebP layers. The room retains a fixed 2400x1600 coordinate system,
scaled as one covering image so the moving pieces remain mounted. CSS transforms
drive motion without per-frame React updates. Pause/menu, page visibility, reduced
motion, and high contrast suspend the layers. The generator retains editable
original SVG sources and a provenance manifest; gameplay downloads no art.

All ten mechanism illustrations share `paintMechanism` between the cabinet and
inventory/shop/catalogue images. Directional spares retain their real direction
and separate quantity metadata. UI images are local 96px PNG data URLs generated
from that painter and repainted when lighting changes. Colored enamel faces and
stronger glyphs distinguish the parts; duplicate ornamental gears were removed
from Doubler and Echo, while Relay retains its functional gear identity. During
actual hits, mechanisms move using the existing short-lived event flashes;
reduced motion disables this added motion. No extra physics steps, tokens, scoring
events, or audio voices are created for the theme.

Successful activations now have stronger per-kind poses: Mint stamp compression,
Vault latch/face movement, Relay rotor motion, branching levers, and Junction
arrival lamps. Contact shadows and edge definition keep parts mounted and tactile.
Blocked effects retain a quiet outline and factual label rather than success
sparks. Payout emphasis scales within the unchanged particle cap; all poses settle
back to a quiet board. Structured `blocked` and `arrivals` event annotations are
validated in saves and do not alter event amounts, collision order, or scores.

Tuned copies show a small marker in both artwork and accessible names. Moving
token values include three charge pips; failed amplifiers show the missing-charge
status. The palette/icon caches and stable feed keys from the confirmed H039 lag
fix remain, avoiding repeated rasterization during bursts of feedback.

The field is quiet at rest: passive physical pegs remain visible, but permanent
decorative adjacency wiring and always-visible socket coordinates are removed.
An installed Relay's real occupied neighbors are linked while it is selected,
hovered, keyboard-focused, or activating. Other adjacent parts do not imply a
connection. Socket coordinates appear on hover/focus; DOM titles and accessible
names still identify every socket. Previously observed ball trails remain optional.

The nine aim targets retain their original positions and actions. Their visual
treatment is a continuous metal rail with a movable hopper, lane marker, and one
gold token when ready to launch. The token is illustrated at the actual spawn
height; a short gate/lever opening accompanies the real release without changing
physics or adding launch delay. Motion is suppressed under reduced motion.

Three recessed payout chutes are built into one continuous base fascia. Dark
openings and angled inner surfaces replace the H028 bowl silhouettes; steel lips
frame the outer intakes and the center uses brass/red accents. Each x1/x2/x1 badge
sits alongside its compact score counter. Collection briefly moves only the
receiving chute's inner flap, highlights its lip, and nudges its counter digits.
The intake returns to rest afterward. Reduced motion retains a static cached
intake and updates only the highlight/value. The original collection boundaries
and accounting are unchanged. Added animations do not continue in an idle board.

After a settled launch, an optional **Last cascade** receipt shows the actual
left x1, center x2, and right x1 payouts and token arrivals, plus Vault deposits
and the longest chain. It starts collapsed and is available on mobile as well
as desktop. The live event feed appears only during a cascade. These are observed
results, not a predicted route, a recommended lane, or a new completion condition.

[scripts/generate-workshop.mjs](../scripts/generate-workshop.mjs) authors the
original layered SVG source and exports two 2400x1600 WebP room images.
[assets/workshop/manifest.json](../assets/workshop/manifest.json) records their
provenance. The regular icon generator invokes it, so packaged builds receive the
same assets as browser play. No third-party illustration, runtime image service,
or new artwork dependency was introduced. This is procedural original art, not
a hand-painted or text-to-image-generated asset claim.

The height-aware layout caps the board track at **850 px** and reserves room for the guide, capacity indicator, and machine controls without changing physical geometry, socket positions, or simulation rules. A **320px desktop track floor** prevents short windows from collapsing the machine below its controls; short panes scroll vertically instead. Normal narrow mobile layouts retain their separate responsive sizing. Full-HD, ultrawide, and mobile layout checks cover control separation and painted-board resizing. Three short-pane cases cover heights of 240-360px, but the user's exact low-zoom case still needs confirmation under D11. Current full-suite and executable evidence is recorded in [docs/VERIFICATION.md](VERIFICATION.md); coverage is described in [docs/TESTING.md](TESTING.md).

Original Web Audio synthesis now gives physical collisions prominent mechanical feedback. Ephemeral `PhysicalImpact` events are separate from `DropResult`: passive peg/wall hits and repeated contacts can sound without scoring again. A scored contact suppresses its duplicate generic impact sound. Parts and payouts have distinct mechanical transients, with bounded voices and soft-limited output independent of earned value.

Defaults remain **0.65 volume** and **0.28 music**. Music continues at 80% of the selected gain while paused or in the menu, without restarting its clock. Production PCM checks at 44.1 and 48 kHz compare feedback against the legacy reference at more than 1.6x while checking headroom. These digital checks do not establish physical speaker audibility or subjective balance.

Settings include master/music levels, mute, trails, theme, playback speed, guide replay, and display mode. Reduced motion and high contrast are in a separate Accessibility dialog. Reduced motion defaults off without automatically following OS preferences; explicitly saved `true` is preserved.

Before showing the window, native startup honors the saved fullscreen boolean only when `fullscreenPreferenceVersion` is 1; fresh/unmarked saves start in standard Electron fullscreen. With `frame: true`, native fullscreen hides window chrome and windowed mode restores the frame and resizing; no exclusive display mode or resolution change is requested. The windowed default is 1280x840 with a 760x540 minimum. Top-bar and Settings mode buttons, plus `F11`, toggle the mode and preserve the marked preference.

Pointer/touch, keyboard, and standard-mapped Gamepad API controls are implemented. The gamepad layer handles spatial focus, previous/next control cycling, activation, back, rotation, launch, menu, and sliders. There are no Steam Input action sets or verified physical-controller/Steam Deck claims.

## Architecture

| Surface | Responsibility |
| --- | --- |
| [src/App.tsx](../src/App.tsx) | Screen flow, controls, edit history, settings, save initialization, import/export, achievements. |
| [src/game/content.ts](../src/game/content.ts) | Part catalog, commission table, power track, achievement definitions. |
| [src/game/engine.ts](../src/game/engine.ts) | Pure run transitions, phase guards, economy, ownership, retries, same-level restart, mode progression. |
| [src/game/model.ts](../src/game/model.ts), [src/game/simulation.ts](../src/game/simulation.ts) | Shared types/limits and authoritative Matter.js token simulation. |
| [src/game/save.ts](../src/game/save.ts) | Version-1 validation, optional desktop fullscreen migration, interrupted-drop recovery, browser backups, profile updates. |
| [src/game/tutorial.ts](../src/game/tutorial.ts), [src/components/QuickGuide.tsx](../src/components/QuickGuide.tsx) | Optional guide progression and actionable highlights without route calculation or economy changes. |
| [src/components/CreditWallet.tsx](../src/components/CreditWallet.tsx) | Workshop-credit wallet and earned/spent receipts. |
| [src/components/PartInventory.tsx](../src/components/PartInventory.tsx) | Separate spare-part selection, current-capacity notice, and next-level capacity timing. |
| [src/components/Board.tsx](../src/components/Board.tsx), [src/render](../src/render) | Canvas rendering, fixed-step playback, board control overlay, bounded effects. |
| [src/input](../src/input) | Standard gamepad polling and focus/navigation behavior. |
| [src/audio/synth.ts](../src/audio/synth.ts) | Original synthesis, event response, output limiting, audio lifecycle. |
| [electron/main.cjs](../electron/main.cjs), [electron/preload.cjs](../electron/preload.cjs) | Sandboxed desktop lifecycle and narrow renderer API. |
| [electron/native-save.cjs](../electron/native-save.cjs), [electron/export-save.cjs](../electron/export-save.cjs), [electron/security.cjs](../electron/security.cjs), [electron/steam.cjs](../electron/steam.cjs) | Native persistence, dialog export, security boundary, optional Steam adapter. |
| [scripts/balance.ts](../scripts/balance.ts), [scripts/strategies.ts](../scripts/strategies.ts) | Affordable-action progression simulation and strategy comparisons. |

Keep game rules in the engine/simulation, presentation in the renderer, and privileged file/Steam operations in the main process. Tests should exercise the controlling layer rather than introducing renderer-only rule exceptions.

## Remaining Design Evidence

The unchanged balance sample includes beginner-policy failures and large late-game output variance. One user playtest reported that the game feels good; this is qualitative feedback, not proof of demand, retention, or sales. Automated completion does not answer whether people understand routes or find enough variety for a fair paid product. Broader closed playtesting should observe unaided progression, commission-8 losses, difficulty recovery, high-output readability, and interest in building another machine. Do not derive session length from simulated physics time.

[docs/OPEN-ITEMS.md](OPEN-ITEMS.md) is the authoritative tracker and [HISTORY.md](HISTORY.md) preserves the chronological decisions. P01-P14 retain their verified outcomes. D08 spare grouping was approved, implemented, and verified on 2026-09-08, including both rebuilt Windows executables. D09 balance review remains explicitly deferred: preserve the opening difficulty and earned big payouts while reviewing multiplier repetition and meaningful later decisions, not a blanket difficulty increase. Other deferred work is not authorized by the inventory change.

D03 was separately approved and implemented on 2026-09-10 (H026). D09's isolated
gift trial was not adopted; the theme changes no economy or balance values. D11's
confirmed short-pane defect is fixed, with exact zoom confirmation still open.

H028 subsequently implements the board-specific refinement approved after H027.
D12/D13 content and reading-load reviews, D14 repositioning necessity, and D09
balancing remain open; a more legible board does not by itself resolve them.