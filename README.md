# Pocket Cascade

A compact, active combo builder about arranging a tiny token machine and improving its chain reactions. Build routes through eight part types, meet minimum payout targets across twelve commissions, and spend earned Workshop credits on the next improvement. Excess output is rewarded, not punished.

The implemented game has one custom brass-and-green Canvas2D cabinet, repeatable Matter.js physics, a finite token-power track, a UTC daily seed, and optional After Hours continuation. It follows the minimum-payout direction from the Pocket Cascade research brief; the original exact-total tray concept is not the shipped rule set. There are no paid token purchases, wagering, online leaderboards, or runtime network-asset dependencies.

**Status (2026-09-07):** the four approved follow-ups are implemented and verified: one-time fullscreen migration, restart/New Workshop controls, removal of the mid-run relaxed-target prompt, and inventory/capacity clarity. **238 unit tests, 52 browser tests, and 11 native tests pass.** Both rebuilt Windows executables passed actual-launch smoke checks. [docs/VERIFICATION.md](docs/VERIFICATION.md) records current evidence and hashes. Real Steam/Cloud, hardware testing, broader human playtesting, signing, and legal/store approval remain release gates.

**Play now:** the running [browser game](http://127.0.0.1:5173/), or the updated [Windows portable executable](release/Pocket-Cascade-1.0.0-win-x64-portable.exe) and [unpacked Windows executable](release/win-unpacked/Pocket%20Cascade.exe). Both Windows builds include these follow-ups. They are unsigned and may show an unknown-publisher warning; they need no Node installation or server.

## Run Locally

Use Node.js **22.12 or newer in the 22.x line**, or a compatible newer LTS, with npm. The current desktop/package target is Windows x64. Start in the project root:

```powershell
npm ci
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). If the port is occupied, use `npm run dev -- --port 5174`; strict port selection avoids silently attaching to a different server. Keep using the same origin because different hosts and ports have separate browser saves.

For the standalone desktop game, build the renderer first:

```powershell
npm run build
npm run desktop
```

Desktop launch loads the built files and does not require Vite or Steam. Fresh and unmarked legacy saves start in **standard Electron fullscreen**, set before the window appears. Legacy saves receive a user-authorized one-time fullscreen upgrade, including old saved `false` values; subsequent windowed choices are remembered. Windowed mode restores the native frame and resizing, with a default size of **1280x840** and minimum **760x540**. This is not exclusive fullscreen and does not change display resolution. Layout checks cover mobile, full HD, and ultrawide screens. The optional native adapter uses `steamworks.js` 0.4.x, but the shipped AppID is **0: unconfigured**. That is not a successful Steam session.

## Playing

The nonblocking **Quick Guide** introduces placing a part, launching, collecting, choosing a free gift, and optional spending. Skip it or replay it from Settings. Highlights identify the next action, never an optimal route; there is no calculated advisor, automatic solution, or extra currency.

Select a part, choose a socket, and aim one of nine lanes. Each commission allows five launches. Collect a successful commission, choose the complimentary part, make any affordable purchases, and advance. Early shops introduce the remaining part types. After a loss, **Retry commission** retains the machine and still adds 10% base-value assistance per retry, capped at 30%. Loss review no longer offers a mid-run relaxed-target switch and never automatically lowers targets. The 35%-lower relaxed option remains available when creating a Workshop; existing assisted saves retain it, and Daily cannot start relaxed.

**Restart level**, the rotate-arrow toolbar control also available in the menu, resets the current attempt to zero score and five launches, discarding any live token. It keeps the machine, spares, credits, upgrades, seed, level, and existing assistance without adding rewards or retry bonuses. It is available while ready, dropping, or lost, but disabled during review, shopping, or victory to prevent collecting twice. **New workshop**, the plus control, opens the existing confirmation and seed choices: confirm to start at level 1 while preserving profile/settings, or cancel without replacing the machine.

The ticket-icon wallet displays **Workshop credits**, with earned/spent receipts. The shop separates its one free gift from paid stock: claiming the gift costs nothing and removes the gift selector. Stock and power purchases are optional and use only earned credits. The currency name changed, not the economy or prices.

Spare parts remain visible above the shop and other editing views without changing tabs. Identical spares share one icon with a corner **x2/x3 quantity badge**; the total at the top still counts every owned spare. Left/right Forks and Kickers have separate groups with direction arrows. Selecting a group selects one actual copy; placement, return, rotation, undo, and salvage preserve individual saved IDs. Newly acquired copies join their matching group, and singleton groups omit the quantity badge. The count is separate from the Doubler's x2 scoring symbol.

Installed capacity sits beside the board toolbar at all supported viewport sizes. At a full machine, swap or return a part; spares stay available. The shop uses the completed level's cap and states when the next level's extra space opens on advance. This changes neither the cap progression nor the 46 physical sockets. Token power applies to **all tokens**, with **no part to place**.

Parts can be placed, swapped, rotated, and returned to the worktable for free. Undo/redo covers recent edits, not launches or trades. A spare salvages for 1 Workshop credit; at the 80-owned-part limit, a complimentary reward converts to 2 Workshop credits. Splits allow two generations and at most four tokens per launch. Each token triggers a part once, and split children inherit earlier visits. A 12-second simulation safety cutoff pays remaining tokens into their current collector rather than deleting points.

**Workshop** is the twelve-commission campaign. **Daily** uses the current UTC date's shared seed without a leaderboard. **After Hours** extends the existing machine with increasing, capped quotas, not an unlimited authored campaign. Full rules and limits are in [docs/DESIGN.md](docs/DESIGN.md).

| Input | Controls |
| --- | --- |
| Mouse / touch | Select a worktable or installed part, then a destination socket; use the inspector for rotation/return/salvage. Choose a lane and launch. |
| Keyboard gameplay | `Space` launches and left/right arrows aim when focus is outside text inputs and buttons. `P` pauses; `M` mutes. Global gameplay shortcuts are suspended in dialogs. |
| Keyboard UI | `Tab` / `Shift+Tab` moves focus; `Enter` or button-focused `Space` activates. `Esc` closes/backs out, clears selection, or opens the menu as appropriate. |
| Standard-mapped controller | D-pad / left stick moves spatial focus; LB/RB cycles controls; A activates; B goes back; X rotates; Y launches; Start opens the menu. Left/right adjusts a focused slider. |
| Desktop display | Top-bar and Settings mode buttons, or `F11`, switch between fullscreen and windowed mode. |

Controller navigation is implemented and covered by injected-gamepad tests. Physical controllers, Steam Input action sets, and Steam Deck compatibility have **not** been validated. No Full Controller Support or Deck certification is claimed.

Settings include volume/music levels, mute, trails, theme, 1x/2x/4x playback, fullscreen, and guide replay. Reduced motion and high contrast are in a separate **Accessibility** dialog. Reduced motion defaults off, does not automatically follow the OS preference, and preserves an explicitly saved enabled setting.

**Physical-impact audio** now gives passive peg/wall hits and repeated contacts prominent mechanical feedback, alongside distinct part and payout transients. Voices are bounded and output is soft-limited without changing earned payouts. Defaults remain 65% volume and 28% music. Music continues at 80% of the selected gain while paused or in the menu, on the same musical clock. Digital production-audio checks are not proof of physical speaker audibility.

## Saves and Backups

Progress autosaves after initialization. Browser storage uses `pocket-cascade.save.v1` and `pocket-cascade.save.v1.backup`. The native primary is:

```text
%APPDATA%\Pocket Cascade\pocket-cascade-save.json
```

Native writes are serialized and atomically replaced with a previous-valid `.bak` recovery copy. Version-1 saves are validated with Zod; an interrupted launch is refunded on reload. Storage failures and recovery are reported visibly. Browser and native storage are separate; use Settings import/export to move a machine deliberately.

The optional version-1 setting `fullscreenPreferenceVersion: 1` marks an authoritative display preference. Desktop load/import migrates an unmarked save to fullscreen and adds the marker, then autosaves; it changes no other settings, run state, or currency. An intentional old windowed choice is indistinguishable from the old false default, so both receive this one-time upgrade. Browser parsing/loading does not apply that migration.

**Export save** downloads JSON in the browser or opens a native save dialog on desktop. The native API accepts validated bounded JSON, not an arbitrary destination path from the renderer. **Import save** validates before replacing the active machine. Starting a new run also replaces the active machine; export first to keep a separate copy. Profile history records seeds and results, not whole restorable workshops. Named save slots remain unimplemented and deferred (D06); autosave/export has not been redesigned into a workshop database. Native saves remain per Windows user, not per Steam account, with no Cloud configuration change.

## Development Commands

[docs/VERIFICATION.md](docs/VERIFICATION.md) owns current test totals, build/package evidence, artifact hashes, and remaining release gates. Complete post-follow-up source and native verification pass, as do both rebuilt Windows launchers. The existing 16-run balance report is retained, not rerun for these follow-ups; scoring, prices, and the original progression are unchanged.

| Command | Purpose |
| --- | --- |
| `npm ci` | Install the locked dependencies, including the optional Steam package where supported. |
| `npm run dev` | Start the local Vite browser build. |
| `npm run build` | Type-check and build the renderer. |
| `npm run desktop` | Launch Electron against the existing build. |
| `npm test` | Run Vitest unit and boundary tests. |
| `npm run test:e2e` | Run browser Playwright tests; first install Chromium with `npx playwright install chromium`. |
| `npm run test:desktop` | Run real Electron integration tests after a build, on an interactive desktop. |
| `npm run test:package` | Launch both actual executables, verify rendering/native saves, record hashes, and quit. Uses the ordinary native save location without changing the run. |
| `npm run test:balance` | Regenerate the full affordable-action balance report. |
| `npm run assets:generate` | Regenerate original PNG/ICO application icons. |
| `npm run assets:steam` | Capture actual gameplay and generate Steam artwork; requires the local server. |
| `npm run notices:generate` | Generate notices for production components and the Electron runtime. |
| `npm run verify` | Build, unit tests, and browser tests; excludes native, full balance, and packaging. |
| `npm run package:dir` | Build the Windows x64 unpacked application. |
| `npm run package:win` | Build the Windows x64 portable executable. |

Regenerate the original local icon assets with the existing script:

```powershell
npm run assets:generate
```

This writes [assets/icon-source.svg](assets/icon-source.svg), [assets/icon.png](assets/icon.png), [assets/icon.ico](assets/icon.ico), and [public/icon.png](public/icon.png). DM Sans and Barlow Condensed are bundled through Fontsource; there are no runtime font downloads.

Use the complete unpacked directory for the Steam depot, not just the executable or portable wrapper. [artifacts/release/verification.json](artifacts/release/verification.json) records the rebuilt packages' hashes, sizes, and executable-level checks. Packaging reuses the locked installed Electron runtime to avoid a Windows staging-directory extraction lock.

## Documentation

- [docs/REBUILD-HANDOFF.txt](docs/REBUILD-HANDOFF.txt): text-only exact-source transfer, destination setup, required design/history context, optional save transfer, and verification limits.
- [docs/HISTORY.md](docs/HISTORY.md): chronological requests, decisions, reversals, implementation and test outcomes, and playtest observations; append after each substantive exchange.
- [docs/DESIGN.md](docs/DESIGN.md): implemented rules, part interactions, determinism, safety limits, and architecture.
- [docs/BALANCE.md](docs/BALANCE.md): economy, exact 16-run results, strategy limitations, reproduction, and human playtest gates.
- [docs/TESTING.md](docs/TESTING.md): focused/full commands, suite coverage, artifacts, and verified versus pending results.
- [docs/STEAM.md](docs/STEAM.md): native API/security, real AppID setup, achievements, Auto-Cloud, private-branch SteamPipe workflow, and hardware caveats.
- [docs/RELEASE-CHECKLIST.md](docs/RELEASE-CHECKLIST.md): ten evidence-backed gates before public distribution.
- [docs/STORE.md](docs/STORE.md): proposed store copy, actual-play screenshots, capsule/library assets, and listing caveats.
- [docs/OPEN-ITEMS.md](docs/OPEN-ITEMS.md): authoritative tracker. P01-P14 and D08 counted spare icons are resolved with outcomes and evidence. D01-D07 and D09 remain open, including named saves, Steam-save investigation, speed-control visibility, and late-game balance review. No balance retuning is approved by the spare-icon change.
- [docs/VERIFICATION.md](docs/VERIFICATION.md): current verification results and package hashes for this follow-up candidate.

The balance sample is encouraging for route-aware automated play, but the beginner policy wins only two of four seeds and already searches the best lane. Its simulated watching time excludes planning and is not human session length. One user playtest reported that the game feels good; that is qualitative feedback, not evidence of demand or sales. Broader closed playtesting is still needed before charging. [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt) is generated and bundled; [LICENSE.txt](LICENSE.txt) remains the unchanged private-project placeholder, not an approved player EULA. Distribution rights, a player-facing EULA, and Steam SDK terms still require owner approval.