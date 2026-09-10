# Pocket Cascade Testing

## Routine Verification

From the project root, use a supported Node/npm installation. Windows x64 with an interactive desktop is required for the current native and packaging checks. Do not disable Electron's sandbox to make a test environment pass.

In PowerShell with restricted script execution, use `npm.cmd` and `npx.cmd`
instead of the `.ps1` shims; do not lower execution policy just for this project.
The VS Code Play task uses `npm.cmd` on Windows. The balance test/comparison tasks
run Node directly and do not depend on a PowerShell script shim.

```powershell
npm ci
npx playwright install chromium
npm run build
npm test
npm run test:e2e
npm run test:desktop
npm run test:balance
```

`npm run verify` is a shortcut for **build + unit tests + browser tests only**. It does not include native Electron tests, the full balance report, packaging, or real Steam/hardware verification.

The browser configuration starts Vite on `http://127.0.0.1:5173` and reuses an existing server outside CI. Ensure that server belongs to this project and reflects the source being tested. Native tests do not use Vite: rebuild first, because they load the existing built renderer directly.

## Focused Commands

```powershell
npm test -- tests/engine.test.ts tests/parts.test.ts tests/simulation.test.ts
npm test -- tests/restart.test.ts tests/save.test.ts tests/display-preferences.test.ts
npm test -- tests/input.test.ts
npm test -- tests/tutorial.test.ts tests/impacts.test.ts tests/audio.test.ts
npm test -- tests/electron-main.test.ts
npm test -- tests/balance.test.ts
npm test -- tests/balance.test.ts tests/gift-variety.test.ts
npm test -- tests/part-stacks.test.ts
npm run test:e2e -- tests/browser/smoke.spec.ts
npm run test:e2e -- tests/browser/campaign.spec.ts
npm run test:e2e -- tests/browser/gamepad.spec.ts
npm run test:e2e -- tests/browser/onboarding.spec.ts
npm run test:e2e -- tests/browser/audio-feedback.spec.ts
npm run test:e2e -- tests/browser/restarts-inventory.spec.ts tests/browser/workflows.spec.ts
npm run test:e2e -- tests/browser/layout.spec.ts
npm run test:e2e -- tests/browser/part-stacks.spec.ts
npm run test:e2e -- tests/browser/gift-variety.spec.ts
npm run test:e2e -- tests/browser/workshop.spec.ts
npm run test:e2e -- tests/browser/board-presentation.spec.ts tests/browser/workshop.spec.ts
npm run test:desktop -- --grep "fullscreen"
npm run test:desktop -- --grep "unmarked false preference"
npm run test:desktop -- --grep "exports the current save"
npm run test:balance -- --quick
```

Run the controlling slice after a change, then the broader affected suites. A focused fullscreen pass does not replace the complete native suite. The quick balance command overwrites the full report artifacts with a smaller sample; regenerate the full report before updating [docs/BALANCE.md](BALANCE.md).

## Unit Coverage

[vitest.config.ts](../vitest.config.ts) selects `tests/**/*.test.ts`. It does not collect browser `.spec.ts` or native `.native.ts` files.

| Files | Scope |
| --- | --- |
| [tests/engine.test.ts](../tests/engine.test.ts) | Commission phases, economy, affordable actions, capacity, retries, progression. |
| [tests/restart.test.ts](../tests/restart.test.ts) | Same-level attempt reset, live-drop cancellation and stale-settlement rejection, retained possessions/totals/profile, no additional retry bonus or duplicate rewards, version-1 save round-trip. |
| [tests/parts.test.ts](../tests/parts.test.ts), [tests/simulation.test.ts](../tests/simulation.test.ts) | Eight part rules, fixed-step determinism, split/trigger limits, scoring and simulation safety. |
| [tests/save.test.ts](../tests/save.test.ts) | Version-1 validation and legacy-profile compatibility, malformed data, browser recovery, interrupted-drop behavior. |
| [tests/display-preferences.test.ts](../tests/display-preferences.test.ts) | Optional fullscreen marker, one-time desktop migration, untouched other preferences/run data, remembered marked windowed choices, fresh defaults, and no browser-only migration. |
| [tests/input.test.ts](../tests/input.test.ts) | Standard gamepad input processing and navigation behavior. |
| [tests/tutorial.test.ts](../tests/tutorial.test.ts) | Nonblocking place/launch/collect/gift/spend progression and optional guide state. |
| [tests/impacts.test.ts](../tests/impacts.test.ts) | Ephemeral physical impacts, passive and repeated contacts, duplicate suppression on scored contacts, unchanged scoring. |
| [tests/audio.test.ts](../tests/audio.test.ts) | Mechanical feedback, production-output safety and headroom; not physical audio-device testing. |
| [tests/electron-main.test.ts](../tests/electron-main.test.ts) | Save/export boundary, trust checks, CSP and file serving, preload/lifecycle, optional Steam mocks, Windows packaging hook. |
| [tests/balance.test.ts](../tests/balance.test.ts) | Legal placement, the early upgrade loop, a full fresh seed-42 optimized twelve-commission run, unchanged default campaign results, detached diagnostic observations, frozen-layout isolation, and bounded local edits. The optimized case checks completion, nonnegative earned currency, owned-part diagnostics, capacity, safe scoring, and improving edits; it does not establish that later repositioning is required. |
| [tests/gift-variety.test.ts](../tests/gift-variety.test.ts) | Inactive gift candidate: unchanged first six shops, bounded deterministic third-choice replacement, total ownership, unchanged other state/paid stock, saved-shop preservation, and untouched final/After Hours rewards. |
| [tests/part-stacks.test.ts](../tests/part-stacks.test.ts) | Display-only grouping, ID conservation, meaningful directions, one-copy placement/return/rotation/salvage, and unchanged version-one save instances. |

Mocked native calls establish adapter behavior, not actual Steam availability, Cloud synchronization, or achievement delivery. Unit fixtures with extreme power or inventory are safety tests, not evidence of affordable campaign progression.

The calculated advisor implementation, UI, and unit test were removed on 2026-09-07 by user decision. Guide checks must not reintroduce route suggestions, automatic solutions, or free currency.

## Browser Coverage

[playwright.config.ts](../playwright.config.ts) runs Chromium with failure screenshots and retained failure traces. The default viewport is 1440x900; responsive cases cover mobile/tablet sizes, full HD, and ultrawide layouts.

- [tests/browser/smoke.spec.ts](../tests/browser/smoke.spec.ts) checks a painted, playable first screen with 46 socket controls, no startup external runtime requests, placement/undo/redo, persistence, pause, interrupted-launch refund, backup/settings recovery, and salvage clearing edit history.
- [tests/browser/layout.spec.ts](../tests/browser/layout.spec.ts) checks height-aware cabinet sizing, full-HD/ultrawide and mobile overflow, and painted-board screenshots, including the new machine controls and adjacent capacity indicator. Layout reserves room for the toolbar and Quick Guide. Responsive checks inspect both canvas buffer pixels and the painted canvas, compare overflow against the configured viewport width, and launch a real token. A populated internal buffer alone is not enough after resize.
- [tests/browser/workshop.spec.ts](../tests/browser/workshop.spec.ts) has nine clockwork cases: a ready-token pixel check at every aim lane followed by exact real-cascade output; neutral-field pixels in both lighting modes; palette/launch-label contrast; three short panes; eight local mechanism images repainting; a moving real cascade and reload; and daylight/reduced-motion play. Short-pane checks verify the 320px desktop floor, not the unconfirmed browser/editor zoom setting from D11. Scenery is decorative and noninteractive. These checks do not certify human enjoyment or every possible contrast combination.
- [tests/browser/board-presentation.spec.ts](../tests/browser/board-presentation.spec.ts) has four cases: isolated renderer payout events check each recessed chute responds locally, returns to a quiet intake, and keeps that intake unchanged under reduced motion; a stationary idle board exposes real Relay-link pixels only in context; and full-capacity mixed-part fixtures at 1440px and 390px check distinct designs, all 46 targets, no horizontal overflow, and exact output after actual 4x UI launches. The injected payout case tests rendering, not earned scoring; separate real-cascade cases compare full simulation results. The Test Workshop task runs both board and workshop files.
- [tests/browser/campaign.spec.ts](../tests/browser/campaign.spec.ts) completes all twelve commissions through actual controls and affordable purchases, persists the win, reloads, and enters After Hours. It uses a route-aware automated planner; it is not an unaided human playtest or coverage of all Daily/After Hours progression.
- [tests/browser/gift-variety.spec.ts](../tests/browser/gift-variety.spec.ts) loads a candidate shop earned through legal simulated play, then uses real desktop/mobile controls to claim a free Echo, install it, launch a painted cascade with exact payout, and reload. It tests a saved candidate fixture, not a live balance-rule change or human satisfaction. The gift experiment remains disconnected from the normal engine.
- [tests/browser/gamepad.spec.ts](../tests/browser/gamepad.spec.ts) covers detection, Start/B menu flow and focus confinement, A/X actions, D-pad/stick and LB/RB navigation, paused focus, React-backed sliders and switches, one launch while Y is held, and disconnect/reconnect. Controller state is injected through `navigator.getGamepads`; no physical controller is exercised.
- [tests/browser/onboarding.spec.ts](../tests/browser/onboarding.spec.ts) exercises the Quick Guide through real actions, skip/replay, Workshop-credit feedback, a free gift that disappears when claimed, and actual paid upgrades. Paid stock remains separate and spending optional.
- [tests/browser/restarts-inventory.spec.ts](../tests/browser/restarts-inventory.spec.ts) covers quick-restart persistence, cancelling a paused live token with exactly one later settlement, New Workshop cancellation/confirmation, free and purchased duplicates placed from one group while the shop stays open, and safe spare ownership at a full cap with extra space opening only on advance. It asserts that both acquired IDs remain individually owned and placeable.
- [tests/browser/part-stacks.spec.ts](../tests/browser/part-stacks.spec.ts) checks counts, selection/deselection, one-copy placement/return, undo/redo, rotation between directional groups, salvage/last-copy removal, disabled controls while dropping, save reloads, and keyboard activation. Dedicated inventory fixtures cover nine spares rendered as four icons and quantity badges separate from the Doubler's x2 at 320px, 390px, and desktop widths. These are UI/storage fixtures, not claims about earned progression; the acquisition test above uses actual campaign rewards and affordable purchases.
- [tests/browser/workflows.spec.ts](../tests/browser/workflows.spec.ts) covers same-difficulty recovery without a relaxed-target loss prompt, Daily seed/profile preservation, browser export/import, and light/high-contrast rendering. This does not remove the existing +10%-per-retry, +30%-maximum loss tune-up; Restart level is a separate action with no additional bonus.
- [tests/browser/audio-feedback.spec.ts](../tests/browser/audio-feedback.spec.ts) covers production mechanical feedback and music continuing on the same clock at 80% of the selected gain while paused or in the menu. Production PCM checks at **44.1 and 48 kHz** compare feedback with the legacy reference at **more than 1.6x**, alongside headroom and bounded-voice output checks. Digital gain/limiter results are not evidence that physical speakers were heard or comfortably balanced.

The full campaign follows legal UI actions, while save-corruption and controller cases intentionally inject their specific fault/input conditions. Do not describe every browser test as untouched end-user play. Read-only diagnostics of Vite singleton modules must import the exact loaded resource URL, including its HMR timestamp, to avoid measuring a second module instance.

## Native Coverage

[playwright.electron.config.ts](../playwright.electron.config.ts) selects only `tests/native/*.native.ts`, with one worker and no retries. [tests/native/desktop.fixture.ts](../tests/native/desktop.fixture.ts) launches real Electron against the built game, waits for the initial load and native save, and uses a temporary data directory. It clears development/Node launch overrides, forces Steam AppID 0, closes each application, and removes its test data.

[tests/native/desktop.native.ts](../tests/native/desktop.native.ts) covers:

- The frozen seven-method preload surface, sandbox preferences, no renderer Node/IPC access, and honest AppID-0 status.
- Production CSP, denied popups/navigation, and denial of file access outside the built renderer.
- Standard native fullscreen before first visibility for fresh/unmarked saves, honoring marked windowed mode, and restoring the native frame/resizing without changing display resolution.
- An unmarked legacy `false` becoming fullscreen once, persisting `fullscreenPreferenceVersion: 1` without altering other saved state, and retaining a subsequent windowed choice through real Electron relaunch.
- Fullscreen controls in the visible top bar and Settings, plus `F11`, persisting the marked preference without changing the run. Final intended-build evidence belongs in [VERIFICATION.md](VERIFICATION.md).
- Renderer-produced save bytes through close and real Electron relaunch, plus an actual UI token launch and persisted progress.
- Settings export through the preload API, parented native-dialog options, and the complete JSON written to the confirmed path.
- Queued writes immediately followed by quit, including preservation of the preceding valid backup.
- Earning and buying duplicate parts through real play, rendering one counted group, closing/relaunching the app, preserving both saved IDs, and placing only one copy afterward.

The export case substitutes the save dialog's response so it can assert file output reliably. It does not operate the physical Windows file picker; manually test selection, cancellation, overwrite confirmation, and unwritable destinations. These tests also do not launch the final portable/depot package or connect to a real Steam account.

## Evidence Snapshot

**H030 collector refinement, 2026-09-10:** the production build and all **13
focused board/workshop browser tests** passed. The new collector test samples
all three receivers in normal and reduced-motion modes. Sparse desktop, busy
mobile, and daylight captures were inspected. Full unit/browser/native suites,
package launches, and store capture generation were not repeated for this small
renderer-only change; the H028 totals below are the last complete-suite evidence.

**H028 board refinement, 2026-09-10:** twelve focused visual checks passed,
followed by the production build, **255 unit tests across 14 files**, **74 browser
tests**, and **12 native tests**. The unit total now includes H027's optimized
twelve-commission run. Local gameplay/capsule captures were refreshed. Windows
portable/unpacked outputs were not rebuilt in this pass; their prior H026 evidence
is not evidence for these latest board visuals. The browser and source-mode
Electron build contain the revision. See [VERIFICATION.md](VERIFICATION.md).

H027 follow-up on 2026-09-10: the requested optimized-run regression was added;
the focused balance/gift task passed **11 tests** (seven balance and four inactive
gift-experiment cases). One full optimized campaign ran inside the test from a
fresh seed; no original reports were overwritten. No artwork or gameplay was
changed for this discussion/test addition, and the broader suites below were not
rerun for it. The necessity of repositioning remains an open review under D14.

**2026-09-10 clockwork delivery:** production build, 254 unit tests, 69 browser
tests, and 12 native tests pass. Both final Windows executables were rebuilt and
launched with decoded local room/mechanism artwork and preserved native gameplay,
profile, and settings. Seven focused workshop cases passed before the final full
regression. See [VERIFICATION.md](VERIFICATION.md) for current hashes and evidence;
the following older entries remain historical context.

The 2026-09-09 D09 trial added separate diagnostics and inactive-candidate tests;
it was not adopted. See [BALANCE.md](BALANCE.md#d09-first-experiment---2026-09-09)
for the 88+88 comparison and [VERIFICATION.md](VERIFICATION.md) for current checks.
The following 2026-09-08 native/package snapshot remains dated evidence, not a new
native or executable launch claim for the D09 pass.

As of **2026-09-08**, D08 counted spare icons are complete alongside P01-P14: the full unit/browser/native suites pass, and both rebuilt Windows executables passed actual-launch smoke checks. Current totals and evidence are in [VERIFICATION.md](VERIFICATION.md), with executable hashes in [artifacts/release/verification.json](../artifacts/release/verification.json).

| Area | Evidence Boundary |
| --- | --- |
| Unit tests | Complete suite passed, including display-only spare grouping, one-copy actions and save conservation, restart safeguards, reward boundaries, legacy save compatibility, and one-time display migration. |
| Browser | Complete suite passed, including campaign, counted spares, free/paid duplicates placed from one group, quantity/effect separation, restart/cancellation, full-inventory retention, next-capacity transition, controllers, and layouts. |
| Native | Complete production-build suite passed, including earned duplicates preserving their IDs across relaunch and single-copy placement, legacy fullscreen migration, and remembered windowed choices. |
| Balance | The saved 16-run production-physics report is retained, not rerun for these follow-ups: all route-aware policies finish all four seeds; beginner finishes two. Economy, simulation, and success predictions are unchanged. |
| Packaging | Both current Windows executables were rebuilt and passed actual-launch rendering/save/security/quit checks; hashes and screenshots refreshed. |
| Real systems | Physical audio/controllers, real Steam achievements/Cloud, Proton/Deck, signing, and clean-machine checks remain separate release gates. |

Do not copy older aggregate test totals into a release claim. Record the final date, runtime versions, command, pass/fail/skip counts, and artifact location after the complete rerun; keep focused and full-suite results distinct.

[docs/OPEN-ITEMS.md](OPEN-ITEMS.md) is the authoritative user-requested work tracker; final verification counts are maintained in [VERIFICATION.md](VERIFICATION.md). D03 and D08 are implemented; D01-D02, D04-D07, and D09-D14 remain open or partial. D09 requires separately examining opening stalls and late-game route dominance before choosing any balance changes, not a blanket target increase. Existing autosave/export coverage is not evidence of a workshop database, named slots, or Steam Cloud support.

`npm run test:package` connects to the actual unpacked and portable launchers over local CDP because the portable wrapper does not forward the stderr required by Playwright's direct Electron launcher. It uses the ordinary player-save location without changing the run, captures a screenshot, and quits through the save-aware API. Ordinary player launches do not enable that debug port.

The package verifier also awaits room/part image decoding, requires the 2400px
local room image, and verifies any visible mechanism images are 96px. Before the
theme package runs, the existing primary/backup save files were backed up outside
the repository and version/run/profile/settings were compared afterward. Generated
asset checks verify both room dimensions and nonblank pixel statistics;
`npm run assets:generate` refreshes the icon and both lighting variants.

## Artifacts and Release Checks

For the isolated D09 diagnostic comparison, use:

```powershell
node --import tsx scripts/balance-diagnostics.ts
node --import tsx scripts/balance-diagnostics.ts --gift-variety
```

Each command writes a new timestamp-named JSON file under
`artifacts/balance/experiments`, never the original sixteen-run report. An optional
positional filename must be new; existing reports are not overwritten. The
candidate switch applies only inside this test runner, not to the dev server or
player saves. Compare actual per-policy outcomes and traces; an exit code of zero
checks safety bounds, not that every campaign completed or that the change is fun.

Browser failures, traces, and explicitly captured gameplay screenshots go under [artifacts/playwright](../artifacts/playwright). The HTML report is [artifacts/playwright-report/index.html](../artifacts/playwright-report/index.html):

```powershell
npx playwright show-report artifacts/playwright-report
```

Native output is configured under `tests/native/.results`. Balance outputs are [artifacts/balance/report.json](../artifacts/balance/report.json) and [artifacts/balance/report.md](../artifacts/balance/report.md). Existing artifacts may predate the latest source; their presence alone is not a fresh pass or approval for store use.

Before release, also run `npm run package:dir` and `npm run package:win`, launch the actual packaged files, and complete [docs/RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md). Cover real save-dialog export/import, upgrade compatibility, Cloud conflicts, focus/text entry/controller mapping, audible music/effects on physical devices, and readability at native minimum and Deck-sized resolutions. Do not substitute editor diagnostics or screenshots for those behavioral and hardware checks.