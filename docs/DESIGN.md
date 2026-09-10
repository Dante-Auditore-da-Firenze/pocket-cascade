# Pocket Cascade Design

## Product Boundary

Pocket Cascade is a compact, active combo builder: arrange a small machine, choose a launch lane, watch a repeatable physical cascade, and spend earned Workshop credits on improvements. The implemented game uses **minimum commission payouts**, not the exact-total tray orders in the original research concept. Excess output is welcome; it never fails a commission.

The scope is one custom Canvas2D cabinet in an original clockwork inventor's workshop, eight part types, twelve authored commissions, a finite power track, a UTC daily seed, and an After Hours continuation. It is not an idle-income game, a large roguelike item pool, an online competition, or a real-money system. The research brief is background, not evidence of approved pricing, playtime, or demand. This build is a technically complete gameplay candidate for closed playtesting, not proof of commercial readiness.

## Play Loop

1. Arrange the machine and choose one of nine launch lanes. The starting machine has three Mints and a Doubler installed, with a Fork on the worktable.
2. Launch from a five-drop commission budget. Parts change token value or route; the outer collectors pay x1 and the center pays x2, subject to the numeric cap.
3. Reach the minimum target to collect Workshop credits. Unused drops and excess payout each add a bounded bonus. Unspent score does not carry into the next commission.
4. Choose one complimentary part, buy optional stock or token-power upgrades, and rearrange before advancing. The first eleven commission shops lead to the next authored commission; the twelfth ends the campaign.
5. If five drops are insufficient, **Retry commission** retains the machine and purchases, adding the existing +10% base value per retry up to +30%. Loss review no longer offers **Continue with relaxed targets (-35%)** and never automatically lowers targets. The initial New Workshop relaxed option still lowers targets by 35%; existing assisted saves retain their setting, and Daily cannot start relaxed.

Placement, swapping, returning installed parts to the worktable, and rotation are free while ready, shopping, or recovering from a loss. Installed capacity rises from 7 to 18 during the campaign; the cabinet has 46 physical sockets, so choosing which sockets to equip matters. After Hours permits 20 installed parts.

The installed/capacity indicator sits beside the board toolbar across viewport sizes. The shop still uses the completed commission's cap: at 7/7, swap or return an installed part, with spares retained. Its notice explicitly says **Next level: 8 installed parts. 1 extra space opens when you advance.** This is clarification, not a capacity, board-dimension, or geometry increase.

The worktable and installed parts share an 80-part ownership limit. Spare parts can be salvaged for 1 Workshop credit. At the ownership limit, the complimentary reward converts to 2 Workshop credits instead of disappearing or adding another part; the shop UI states this conversion.

`PartInventory` stays visible above the shop and other editing views without a tab change; it also remains visible but disabled during a drop. Equivalent spares share one selection button with a corner xN quantity badge when the count exceeds one. The inventory heading counts all spares, not groups. Quantity is visually separate from the part's scoring symbol. Fork and Kicker directions form separate groups with arrows; direction metadata is irrelevant for nondirectional parts and is not rewritten.

Grouping is presentation-only: the version-1 save still contains every individual part ID and direction. The currently selected copy is retained within its group, including a newly bought/free copy; otherwise selecting a group picks its first available member. Placing or salvaging affects one copy, returning a part increases its group count, and rotating a directional copy changes only its own group. Placement keeps the existing deselection behavior. Paid token power is labeled **All tokens. No part to place.** It upgrades base value, not inventory.

**Restart level** uses the rotate-arrow toolbar button or the menu. `canRestartCommission` permits only `ready`, `dropping`, and `lost`; `restartCommission` returns to `ready` with score 0, five launches, and null `lastDrop`/`activeDrop`. It preserves the board, bench, credits, upgrades, seed, stage, assisted flag, retries, cumulative run totals, and profile. The live simulation is disposed without a later payout. Restart grants no reward or additional retry bonus and is disabled in `review`, `shop`, and `won` to prevent collecting twice.

**New workshop**, the plus toolbar control or menu entry, opens the existing confirmation and seed dialog. Confirmation starts level 1 with the selected seed/options while preserving profile and settings; cancellation leaves the current machine intact. It is not a same-level restart or an additional save slot.

Undo/redo stores up to 30 recent machine edits in memory. It does not rewind completed launches or purchases. Launching, restarting, trading, collecting, advancing, starting a new run, and importing clear edit history. Salvage is a trade, so it cannot be undone for repeated credits.

The player-facing currency is **Workshop credits**, shown in a Lucide Ticket-icon wallet with earned/spent receipts. Internal `RunState.brass`, economy rules, and prices are unchanged. The one free gift is separate from paid stock, costs nothing to claim, and its selector disappears once claimed. Spending on stock or power remains optional.

## Quick Guide

The nonblocking guide follows **place, launch, collect, gift, spend**. Players may skip it or replay it from Settings. Actionable highlights identify controls, not a calculated best lane or layout; the guide grants no extra currency and does not complete actions for the player.

Calculated advisor code and its UI/tests were removed on 2026-09-07 by user decision. No route suggestions remain. That removal did not retune the economy or assistance values; the later approved loss-flow follow-up removed the mid-run relaxed choice as described above.

## Parts

Effects use the current launch's base value. Numeric additions, multiplications, and payouts are rounded and bounded by the simulation's `money()` helper.

| Part | Effect | First Availability |
| --- | --- | --- |
| Mint | Adds 140% of base value. | Start |
| Doubler | Multiplies current value by 2. | Start |
| Fork | Adds a child worth 75% of the parent's current value; parent retains its value. At the generation limit, multiplies the hitting token by 1.25 instead. | Start |
| Kicker | Adds one base value and kicks left or right, with an upward component. Rotation chooses the direction. | Shop after commission 2 |
| Relay | Adds one base value, plus one per equipped adjacent socket. Interior sockets have up to six neighbors. | Shop after commission 3 |
| Vault | Banks 50% of current value immediately without reducing the token's eventual payout. | Shop after commission 4 |
| Echo | Repeats the most recent recorded addition or multiplier from Mint, Doubler, Relay, or Crown. With none, adds one base value. | Shop after commission 5 |
| Crown | Multiplies by `1 + 0.4 * distinct part kinds hit`, including itself; at most x4.2 for eight kinds. | Shop after commission 6 |

Echo does not repeat splitting, banking, or routing, and does not replace its remembered effect with a new one. Kicker's addition is not recorded for Echo. Fork direction determines the child's initial side and sends the parent the other way.

Definitions, descriptions, prices, unlocks, and achievement names live in [src/game/content.ts](../src/game/content.ts); effects are computed in [src/game/simulation.ts](../src/game/simulation.ts). Changes to either must keep the other truthful.

## Determinism and Limits

- Matter.js advances at a fixed **120 Hz**: `1000 / 120` milliseconds per step. Rendering speed is not a variable physics timestep.
- Every launch uses the run's unchanged seed. The same board, lane, base value, seed, and runtime should reproduce the same event trace; merely advancing a commission or repeating a launch does not reroll its physics. Shop choices use separate seed/stage offsets.
- Collision effects are processed in stable token/socket order. Reproducibility is a same-build contract, not a guarantee across future Matter.js versions or untested platforms.
- Each equipped socket triggers at most once per token per launch. Children inherit visited sockets, encountered part kinds, and the remembered Echo effect, so a split does not reset earlier triggers.
- Forks allow two generations and at most **four tokens created per launch**. Tokens collide with the cabinet and pegs, not with each other. Extra Fork hits multiply value instead of silently discarding a prospective reward.
- Slow tokens receive a deterministic nudge. At **1,440 ticks / 12 simulated seconds**, any remaining token pays into the collector corresponding to its current horizontal position. Already banked points remain; the safety timeout does not delete points. The result records `timedOut`.
- `MAX_VALUE` is **1,000,000,000,000**. It caps individual token values and bounded contributions, including collector payouts; the total launch score can include several contributions. This is a finite numeric safety limit, not unlimited growth. Current part-effect labels do not indicate saturation, a remaining readability concern at extreme values.
- Visual effects are bounded to **160 particles** and **10 floating labels**. Reducing or dropping visual effects must not change simulation scoring.
- Physical-impact events and audio voice limits are presentation-only; neither changes `DropResult` or earned-value accounting.
- Accounting is `total = banked + left collector + center collector + right collector`. The engine rejects inconsistent settled totals.

See [src/game/model.ts](../src/game/model.ts) for board geometry and limits, and [docs/BALANCE.md](BALANCE.md) for progression and measured results.

## Modes and Progression

**Workshop:** twelve authored commissions, deterministic seed entry, standard or relaxed targets. Numeric seeds up to an unsigned 32-bit value are accepted directly; other nonempty seed text is hashed. Blank input creates a new seed.

**Daily:** the same twelve-commission rules with a seed derived from the current UTC date. All players using that date and build receive the same seed. Relaxed targets are disabled, while the normal retry bonus remains available. Completion is recorded locally; there is no leaderboard, server verification, prize, or anti-cheat claim.

**After Hours:** optional continuation after a completed run, with five drops per commission, 20 installed parts, and increasing minimum quotas. Quotas grow by 1.38 per additional commission and cap at 1 billion before relaxed-mode adjustment. This reuses the existing parts and progression; it is not a promise of infinitely expanding content.

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

All eight mechanism illustrations share `paintMechanism` between the cabinet and
inventory/shop/catalogue images. Directional spares retain their real direction
and separate quantity metadata. UI images are local 96px PNG data URLs generated
from that painter and repainted when lighting changes. Colored enamel faces and
stronger glyphs distinguish the parts; duplicate ornamental gears were removed
from Doubler and Echo, while Relay retains its functional gear identity. During
actual hits, mechanisms move using the existing short-lived event flashes;
reduced motion disables this added motion. No extra physics steps, tokens, scoring
events, or audio voices are created for the theme.

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