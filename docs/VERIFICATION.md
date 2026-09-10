# Candidate Verification

## Recessed Chutes - 2026-09-10

H030 implements the approved collector-only follow-up: three recessed payout
chutes in a continuous base, angled metal lips, x1/x2/x1 plates beside compact
counters, and a brass/red center. The rest of the H028 board is unchanged.

- **13 focused browser tests passed** through Pocket Cascade: Test Workshop,
  covering both workshop and board-presentation files.
- The new renderer test injects a payout into each receiver in normal/reduced
  motion, requires other collectors to remain unchanged, checks flap response,
  return to rest, and a stationary reduced-motion intake. Existing actual UI
  launches still compare complete payout results with the real simulation.
- **Production TypeScript/Vite build passed.** Editor diagnostics are clean.
- Sparse desktop, full-capacity mobile payout, and daylight screenshots were
  inspected. The active prototype and compiled renderer contain the change.
- Git diff confirms no changes to game rules, audio, native boundaries,
  dependencies/lockfile, or original balance reports.

The expanded reduced-motion test initially detected an unnecessary repaint of
cached chute geometry. Skipping that repaint in reduced-motion mode fixed the
same focused check; the payout highlight and final value remain available.
This is a rendering regression check, not a human-enjoyment claim.

Full unit/browser/native suites and packaged executables were not rerun for this
small pass. Their H028/H026 results below remain dated evidence. Store captures
still show the H028 bowls; the latest collector screenshots are in the focused
browser artifacts. No gameplay rebalance, full-board redesign, or publication
was performed. The live prototype is at **http://127.0.0.1:5173/**.

## Board Refinement - 2026-09-10

Current prototype: neutral-field, red-housing clockwork board with a rail-mounted
drop head, recessed collectors, clearer mechanisms, and contextual Relay cues.
H028 authorized implementation of the H027 board proposal, not changes to balance
or the separate text reviews. This is local development, not a shipped-game claim.

| Check | Result |
| --- | --- |
| Focused board/workshop tests | **12 passed**: nine workshop checks plus three new board-presentation cases. |
| `npm.cmd run verify` | Production TypeScript/Vite build, **255 unit tests across 14 files**, and **74 browser tests** passed. |
| Optimized full run | H027's fresh seed-42 twelve-commission optimized regression passed as part of the unit suite; no new balance assumptions were added. |
| Production Electron | **12 native tests passed** against the new built renderer. |
| Local artwork captures | Five 1920x1080 legal-campaign screenshots, eight capsule/library exports, and twenty achievement variants regenerated with the existing capture task; no store publication. |
| Scope check | Git diff confirms no changes to src/game, src/audio, electron, manifests/lockfile, or the original balance reports. |
| Packages | Not rebuilt or launched this pass. Existing H026 portable/unpacked executables retain the earlier board; use the live browser or `npm.cmd run desktop` after the current build for this refinement. |

The new tests sample a neutral field in both lighting modes, locate the ready gold
token at each of nine aim positions, verify actual-release output, and compare
quiet/inspected Relay-link pixels. Full 18-part fixtures at desktop/mobile widths
exercise a real 4x cascade with exact result equality. The field keeps passive
pegs visible, socket targets and coordinates accessible, and the three original
collector boundaries. At idle, no decorative link animation competes with the
parts; real hits still produce limited local feedback.

Sparse, full-capacity, active, daylight, and mobile screenshots were visually
inspected. The full-capacity fixtures are not claims of affordable earned builds;
the separate complete campaign test uses legal actions. Earlier contrast,
reduced-motion, layout, controller, audio, and inventory checks also pass in the
full suite. The final task output records **74 passed (5.5m)**. No additional
hardware/performance or exact browser-zoom certification is inferred.

The prototype remains running at **http://127.0.0.1:5173/**. No commit, push,
remote configuration, copy purge, balance tuning, or save reset was performed.
D12-D14 and D09 remain open. Older results below are historical checkpoints.

## Optimized Regression - 2026-09-10

H027 adds one full fresh seed-42 optimized campaign test in
[tests/balance.test.ts](../tests/balance.test.ts). The focused
**Pocket Cascade: Test Balance** task passed **11 tests across two files**:
seven balance tests and four inactive gift-experiment tests. The new campaign
case completed all twelve commissions using the existing legal-play runner and
checks target completion, nonnegative currency, owned-part diagnostics, capacity,
bounded tokens, no timeouts, safe integer score, and improving edits.

This is a completion regression, not proof that later repositioning is required
or that all players/seeds are balanced. D14 tracks that question; the earlier
frozen-after-six evidence remains relevant. Board/art/color and copy suggestions
were discussed and recorded only. No runtime code, artwork, saves, dependencies,
or original balance reports changed. No new full build/browser/native/package
run is claimed for this test addition; the clockwork totals below remain the
last complete verification of the runtime, not a count including this new test.

## Clockwork Workshop - 2026-09-10

H026 checkpoint: **Pocket Cascade 1.0.0, clockwork workshop**, Windows x64.
These packaged executables predate the H028 board refinement above.
The user delegated theme selection and implementation. Original workshop artwork,
coordinated cabinet/part rendering, and hit-driven visual motion are delivered;
there is no claim that the selected theme guarantees sales or human enjoyment.

| Check | Final Outcome |
| --- | --- |
| `npm.cmd run verify` | Production TypeScript/Vite build, **254 unit tests across 14 files**, and **69 browser tests** passed. Zero failed/skipped tests; zero flaky browser results. |
| Focused workshop checks | **7 passed**, including day/evening palette and launch-label contrast, three short panes, eight distinct repainting mechanism images, exact real-cascade result/reload, and reduced-motion play. |
| Existing layout/inventory slice | **26 passed** before the full regression: all 18 layout cases and eight counted-spare cases. |
| `npm run test:desktop` | **12 native tests passed** against the final production renderer, covering actual play, CSP/isolation, save/export, fullscreen, and relaunch. |
| Original asset generation | Two 2400x1600 WebP room images, SVG authoring sources, and app icon exports generated with dimension/nonblank pixel checks. No third-party illustration or network generation service used. |
| `npm run assets:steam` | Five actual-play 1920x1080 screenshots, eight capsule/library images, and twenty achievement variants refreshed from legal campaign actions and original artwork. |
| `npm run package:win` | Final portable and unpacked Windows applications rebuilt after the daylight contrast correction. |
| Actual executable checks | **Both final launchers passed** with decoded workshop/part images, painted canvas, native save, CSP, renderer isolation, and save-aware quit. |
| Save preservation | Existing native primary and backup copied outside the repository before checking; version, run, profile, and settings compare equal afterward. Normal saved timestamps are excluded. |
| Rule preservation | Git diff verifies no changes to src/game, src/audio, electron, package manifests/lockfile, or the original balance reports. Full balance generation was not rerun for a presentation-only change. |
| Git/publication | Existing repository and remote left intact; no stage, commit, push, branch, or remote-policy operation for this theme. The earlier uncommitted discussion records were preserved. |

Final package record: `2026-09-09T21:38:29.056Z`, which is 2026-09-10 in the
recorded local UTC+05:30 timezone. Runtime: Node 24.15.0, npm 11.12.1, Electron
43.4.1, Playwright 1.63.0, Vite 7.3.6, Vitest 4.1.11, electron-builder 26.15.3,
Windows 10.0.26200. Packages remain unsigned despite builder signing-step messages;
no signing identity was configured by this work.

| H026 Packaged Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `release/Pocket-Cascade-1.0.0-win-x64-portable.exe` | 99,207,411 | `588fcbcffdfdec0e94ad849bf96f8bc470f2e1d31724677c9b965daee7cfc300` |
| `release/win-unpacked/Pocket Cascade.exe` | 235,782,656 | `a280f7e96b52e92c5d02ad3c1331fc4d47aa77cf833c6795c527ac4849a95431` |

Machine-readable [package evidence](../artifacts/release/verification.json) and
[save-preservation evidence](../artifacts/release/theme-save-check.json) accompany
the [portable capture](../artifacts/release/portable.png) and
[unpacked capture](../artifacts/release/unpacked.png). The ordinary game remains
available at **http://127.0.0.1:5173/** through Pocket Cascade: Play.

The room images are **79,986 bytes** (daylight) and **103,722 bytes** (evening),
with [original-source provenance](../assets/workshop/manifest.json). Shared part
images are generated locally by the same mechanism painter as the cabinet, not
fetched from a service. Representative desktop, 320px mobile, daylight, active
cascade, store-capsule, and actual packaged captures were inspected. The new
contrast test checks seven palette text roles against the surface plus launch
and small launch-label text at at least 4.5:1 in both lighting modes; it is not
a blanket accessibility certification for every layered pixel combination.

D11 remains open: a 320px desktop track floor fixes the confirmed short-pane
collapse, tested at 1280x360, 1100x240, and 1920x360, but the user's exact zoom
mechanism/percentage was not reproduced. No browser/editor zoom certification is
inferred from changing viewport sizes. No frame-time benchmark on lower-end
hardware, physical audio/controller test, real Steam/Cloud/Deck check, store
upload, or legal approval is claimed. D09 balance and the other deferred systems
are untouched. Older dated verification below is retained as historical evidence;
the top section and current package JSON identify the latest delivered build.

## D09 Experiment - 2026-09-09

The approved first balancing experiment was **not adopted**. Normal game/runtime
files, prices, effects, targets, power, saves, and original balance reports remain
unchanged. This pass adds diagnostic tooling, tests, and a Windows task-shim fix.
The current game is still available through **Pocket Cascade: Play** at
**http://127.0.0.1:5173/**.

| Check | Current Outcome |
| --- | --- |
| Focused unit checks | **10 passed**: six balance-runner checks plus four isolated gift-candidate checks. |
| Focused browser checks | **2 passed** at 1440px and 390px: an earned shop fixture, zero-cost gift, useful placement, actual cascade/payout, and reload persistence. Captures inspected. |
| Independent browser rule probe | 512 late states and 96 early shops checked; 56 third choices changed, no player storage touched. This is boundary sampling, not campaign completion evidence. |
| Diagnostic comparison | **88 baseline + 88 candidate campaigns**, eight fixed seeds and eleven legal policies. All completion outcomes unchanged; 87/88 full records identical, one run worse. No new stalls or safety violations. |
| Preservation | Original sixteen campaign records reproduced exactly; **40 runtime/native, manifest/lockfile, and original balance files** still match the handoff. |
| Normal Play task | Windows npm.cmd override verified; ordinary task starts Vite on 5173 without changing execution policy. R02 resolved. |
| Full build/unit/browser regression | `npm.cmd run verify` passed the TypeScript/Vite build, **254 unit tests across 14 files**, and **62 browser tests**. Zero failed/skipped tests and zero flaky browser results. |
| Native/packages | Not rerun or repackaged for this test-only experiment; dated 2026-09-08 evidence below remains applicable to the unchanged runtime. |

The measured [comparison](../artifacts/balance/experiments/comparison-2026-09-09.json)
records 33 changed offers, 17 changed picks, and no progression/recovery benefit.
On splitter seed 1, launches rose from 15 to 16 and best payout fell from 9,276 to
8,043. The inspected UI Echo adds 73 points to 4,648, with the next 4,200 target
already attainable. Passing functional tests does not certify human satisfaction.
See [BALANCE.md](BALANCE.md#d09-first-experiment---2026-09-09) and HISTORY.md H019.

The complete [unit JSON report](../artifacts/balance/experiments/unit-verification-2026-09-09.json)
was captured in an additional full run after terminal truncation hid the first
unit summary; all 254 tests again passed, starting at `2026-09-09T18:40:47.927Z`.
The [browser report](../artifacts/playwright-report/index.html) records 62 passed,
zero failed/flaky/skipped, including the full normal campaign and two candidate
fixture cases. Editor diagnostics and final documentation checks are clean.

## Restore Evidence - 2026-09-08

Date: **2026-09-08** (local, UTC+05:30). Candidate: **Pocket Cascade 1.0.0, counted spare icons**, Windows x64.

This records fresh verification of the workspace restored to
`C:\Repos\pocket-cascade` from the supplied text handoff. All **139 transferred
files** matched their snapshot hashes before installation. After verification,
**74 implementation, test, package, lockfile, and original balance files** still
matched the snapshot. No game-source or dependency-version changes were needed.
Earlier source-machine delivery evidence remains in [HISTORY.md](HISTORY.md).

## Restored Results

| Check | Result |
| --- | --- |
| Handoff integrity and helper tests | All **139 files** hash-verified; **7 transfer tests passed** with `node --test scripts/text-handoff.test.cjs`. |
| `npm run build` | TypeScript and production Vite build passed. |
| `npm test` | **246 tests passed across 13 files**. |
| `npm run test:e2e` | **60 browser tests passed**, with zero failed, flaky, or skipped tests. Includes the complete campaign, counted spares, duplicate acquisition and placement, quantity/effect badge separation, guide, restart/cancellation, capacity transitions, audio, controllers, and responsive layouts. |
| `npm run test:desktop` | **12 native Electron tests passed**, including earned duplicates preserved across relaunch and single-copy placement, actual play, saves/export, legacy fullscreen migration, remembered later windowed choices, visible controls/F11, and manual loss recovery. |
| Full balance reproduction | All **16 legal campaigns** rerun in an isolated working directory. Every run result exactly matches the original baseline: 14 completed, two known beginner-policy stalls, at most four tokens, zero timeouts, and safe integer scores. Original reports remain byte-identical. |
| Steam artwork | Historical captures and artwork restored from the handoff; the optional `npm run assets:steam` generator was not rerun. |
| `npm run notices:generate` | Complete notice text generated for twelve installed components and included in the package. |
| `npm run package:win` | Portable and unpacked Windows outputs rebuilt on this machine, including original icon generation and a fresh production build. |
| Package smoke verifier | **Both actual executables launched and passed** rendering, native-save, CSP, renderer-isolation, and save-aware quit checks. The existing `scripts/verify-package.mjs` ran with an external save-backup guard. No pre-existing native save was present; a fresh version-1 workshop was initialized without playing. |
| Dependency installation and audit | `npm ci` installed the locked dependencies and reported **0 known vulnerabilities**. No upgrades or audit fixes were applied. |
| Editor diagnostics | No errors reported. |
| Git | No `.git` directory created; no branches or commits made. |

Environment: Node **24.15.0**, npm **11.12.1**, Windows **10.0.26200**,
Electron **43.4.1**, Playwright **1.63.0**, Vite **7.3.6**, Vitest **4.1.11**,
and electron-builder **26.15.3**. Package versions are locked by
`package-lock.json`. Physical audio devices, controller models, Steam accounts,
and Steam Deck hardware were not exercised.

The build, unit, and browser commands were run separately, followed by the complete
native suite against the production build. Browser results are available in
[the Playwright report](../artifacts/playwright-report/index.html). The full
balance script ran through `tsx` from a temporary working directory; its new
[JSON report](../artifacts/balance/restored-2026-09-08/report.json) and
[readable report](../artifacts/balance/restored-2026-09-08/report.md) are separate
from the preserved originals. Both rebuilt Windows artifacts were then launched
by the existing package verifier. Its machine-readable record is timestamped
`2026-09-08T17:12:20.498Z`.

## Local Setup

Node and npm were initially unavailable. The official Node 24.15.0 Windows x64
archive was checksum-verified and installed for the current user under
`%LOCALAPPDATA%\Programs\nodejs\node-v24.15.0-win-x64`, with the user PATH updated.
Chromium and the locked Electron runtime were downloaded successfully.

At restoration, the Play task inherited the editor's pre-install PATH and failed
to find npm, so an explicit Node path was used temporarily. On 2026-09-09 the task
found the installation but PowerShell blocked npm.ps1. A Windows-only npm.cmd
override fixed ordinary **Pocket Cascade: Play** startup at
**http://127.0.0.1:5173/** without changing system execution policy or hardcoding a
machine-specific path. R02 is resolved in [OPEN-ITEMS.md](OPEN-ITEMS.md). Old
terminal sessions can still require reopening to inherit the updated user PATH.

## Historical Restore Artifacts

These are the 2026-09-08 restore hashes, not the current theme executables. Use
the clockwork-delivery table above for the files now in the release directory.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `release/Pocket-Cascade-1.0.0-win-x64-portable.exe` | 98,996,065 | `0b14bdaa845abdd7690f9d4d31fa7ddfea3bbee72b3a7dfb44cb3d02b4e32050` |
| `release/win-unpacked/Pocket Cascade.exe` | 235,782,656 | `a56082753d33d36958b5f105bf0299d9723bcf358e6f28ed4960761ba42e9fd4` |

The portable download is approximately **94.4 MiB**. Both executables are
unsigned. Use the **whole** `release/win-unpacked` directory as Steam depot
content; the main executable alone is not a self-contained distribution.

The machine-readable record, including AppID-0 status, rendered color counts,
save version, and security checks, is
[artifacts/release/verification.json](../artifacts/release/verification.json).
The separate [save guard record](../artifacts/release/restore-save-check.json)
confirms that no destination native save existed before these launches. The
handoff intentionally excludes the source player's personal save.
Actual packaged-window screenshots are
[unpacked.png](../artifacts/release/unpacked.png) and
[portable.png](../artifacts/release/portable.png).

## Experience Evidence

- The browser campaign buys only affordable upgrades, places owned parts, launches
  real physics, completes all twelve commissions, reloads the win, and enters
  After Hours. It uses a route-aware planner, not a human novice.
- Eighteen focused layout cases cover mobile through 3440x1440 ultrawide,
  with and without onboarding. They check cropped screenshot pixels, canvas
  buffers, overflow, track sizing, and non-overlapping controls. Representative
  1920x1080 desktop and 320px mobile screenshots were visually inspected.
- Physical peg/wall contact feedback uses a separate ephemeral channel. Tests
  compare scoring trace hashes, forward actual contacts exactly once, and enforce
  voice/rate limits. Production PCM checks at 44.1 and 48 kHz measure more prominent
  mechanism sounds than the earlier tone, passive contact audibility digitally,
  output-limiter headroom, and silence when muted. Physical loudness remains a
  human check. A real menu-open/close test verifies music keeps advancing on the
  same clock at a softly reduced gain.
- The nonblocking guide is tested from placement through collection, one free
  gift, and an actual paid upgrade. Tests cover keeping credits instead of buying,
  skip/replay, legacy-save compatibility, and progress after reload. No optimal
  route or artificial currency is granted.
- Reduced motion remains off even when the OS requests it; its optional
  Accessibility setting and explicitly saved choice survive reload. High contrast
  remains available in the same section.
- Native fullscreen tests compare actual content/window bounds with the display,
  verify no display-resolution change, restore normal windowed chrome/resizing,
  and exercise top-bar/settings controls and F11. Unmarked older saves migrate to
  fullscreen once using `fullscreenPreferenceVersion: 1`; later explicit windowed
  choices are honored. Native round-trip tests preserve the complete run, profile,
  and other preferences. Browser-only saves are not forced into fullscreen.
- Restart-level tests use actual play and paused live tokens: only attempt points,
  launch budget, last result, and active simulation are reset. Layout, inventory,
  credits, upgrades, seed, difficulty, and cumulative earned totals remain. There
  is no extra retry bonus. Success/shop/victory phases reject restart to prevent
  reward duplication. New Workshop cancellation leaves the run intact; confirmed
  creation starts level 1 while preserving profile and settings.
- Inventory tests buy real affordable parts, place both the free gift and purchased
  part while the shop stays open, fill the current installation limit, and retain
  the extra part until the next commission opens its advertised space. Screenshots
  of shopping and full inventory were inspected. The logical board and capacity
  progression are unchanged; the taller toolbar has its own layout allowance.
- Counted spare tests preserve individual IDs through selection, one-copy placement,
  return, undo/redo, rotation between directional groups, salvage, and reload. The
  new native case earns and buys duplicates before a real close/relaunch, then
  places only one copy. Quantity badges remain separate from the Doubler's x2
  effect at 320px, 390px, and desktop widths, including an ownership-limit fixture.
  During the earlier source-machine D08 check, both packaged screenshots showed
  the player's nine spares as four groups. Its before/after SHA-256 of
  version/run/profile/settings matched
  `3b7d9bd3a4cf8f2ced415e6bb791841f2dade21fc8cb6d22671b48e5e6d0b09a`;
  normal autosave timestamps were excluded. That is historical evidence, not a
  transferred-save comparison on this machine. The current package screenshots
  show the fresh destination workshop instead.
- Controller tests exercise standard mapped input, spatial/linear focus, menus,
  sliders, activation, rotation, held launch behavior, and disconnect. Inputs are
  simulated; no physical controller or Steam Input certification is claimed.
- Loss recovery is tested after real failed launches, with manual part placement
  and retained ownership/credits. The calculated advisor and its worker were
  removed at the user's request; their controls are asserted absent. The mid-run
  relaxed-target prompt and helper are also removed. Starting Workshop difficulty
  selection and the existing loss-only Retry commission bonus remain available;
  the new quick restart does not increase that bonus.

## Balance Boundaries

All route-aware policies finished all four sample seeds. The simple beginner
policy finished two of four; two stalled on commission 8. A separate relaxed-only
probe also finished two of four, with the other two stalling later. Calculated
advice was added after that original report and then removed in this polish pass
by explicit user decision. New controls onboarding teaches the workflow, not a
solution, and is not a claim of universal campaign completion.

Simulated cascade watching time excludes planning and menus. The report is not a
human session-length, enjoyment, retention, sales, or pricing study. Read
[BALANCE.md](BALANCE.md) before changing economy values or using these results in
store claims. The original 16-run report remains intact. Endgame chaos, board
expansion, theme, dedicated menu music, named saves, and Steam autosave/Cloud decisions remain
open in [OPEN-ITEMS.md](OPEN-ITEMS.md); none were implemented in this pass.

D09 records the user's important but explicitly deferred balance review. Protect
the accessible opening; do not increase every target to suppress later output.
Review repeated Doubler/Crown availability or cost, rewards/capacity growth,
competing builds, and varied contracts before selecting changes. Preserve earned
big payouts, deterministic routes, and existing saves. No targets, prices, part
effects, rewards, capacity values, physics, or balance-report results changed for D08.

## Remaining Release Gates

Human playtesting and final balance judgment; assigned Steam AppID and authorized
Steamworks testing; actual achievements/Cloud/overlay verification; physical
audio/controllers and Proton/Deck; lower-spec clean-machine checks; signing;
distribution rights, EULA and SDK-term review; storefront review and approval.

Steam AppID **0 remains intentionally unconfigured**. No Steam page or depot was
uploaded, no payment or account was created, and no commercial release approval
is implied. See [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md) and
[STEAM.md](STEAM.md).

## Nonblocking Build Notes

Vite reports that the external `theme.js` is not bundled. It is deliberately
copied from public assets and loaded before the app to preserve production CSP.
Rollup also reports annotation comments in Zod; those comments are discarded.
The production build and all native file-loading tests pass with these messages.

Electron packaging reuses its installed locked runtime, avoiding a Windows
staging-directory rename lock encountered during redundant extraction. The
failed generated staging directory was removed. Native test app paths are
normalized before Windows shell quoting. The portable package smoke test uses
local CDP because its wrapper does not forward direct-launch debugging stderr.