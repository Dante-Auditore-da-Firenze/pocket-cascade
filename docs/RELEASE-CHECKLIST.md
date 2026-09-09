# Pocket Cascade Release Checklist

## Release Position

This is a compact, technically complete gameplay candidate with functioning browser/native paths, not a certified, signed, uploaded, or commercially validated Steam release. Keep the next distribution private and use a closed playtest to establish clarity, enjoyment, and perceived value before charging. Do not convert automated completion into a playtime, retention, price, or sales promise.

Check each gate only after recording a dated result for the intended build. Existing test reports and generated assets are useful evidence, but are not substitutes for testing the final packaged game. An unchecked item means pending evidence or an explicit product/release decision is still needed.

## User-Requested Work

[docs/OPEN-ITEMS.md](OPEN-ITEMS.md) is the authoritative tracker. **P01-P14 are resolved with implemented outcomes and evidence.** Complete post-follow-up suites and both rebuilt executable launches pass; current totals and hashes are in [docs/VERIFICATION.md](VERIFICATION.md). This resolves the requested usability work, not the broader human/platform release gates below.

These items remain **Open / Deferred**, not implemented additions or release promises:

- **D01:** Massive chaos/endgame.
- **D02:** Board expansion.
- **D03:** Theme.
- **D04:** Steam-specific autosave/Cloud investigation; existing atomic local autosaves are unchanged.
- **D05:** Dedicated music.
- **D06:** Named save slots; existing autosave/export is not a workshop database, and profile seed/result history does not restore whole workshops.

## Ten Gates

1. [ ] **Human experience.** Observe unaided new players arranging a useful route, understanding payouts and Workshop-credit receipts, claiming the free gift, choosing optional paid upgrades, recovering from failure, and completing the early loop. Check that the nonblocking Quick Guide teaches actions without supplying a route or extra currency, and that skip/replay is discoverable. Verify players understand New Workshop confirmation, separately selectable spares above the shop, installed capacity versus 46 physical sockets, space opening only on advance, and token power applying to all tokens with no part to place. Record actual planning/session time, frustration, late-game repetition, voluntary replay, and perceived value. One positive user playtest is qualitative evidence, not validation of the eight-part/twelve-commission paid offer or research price.

2. [ ] **Seed coverage and difficulty progression.** Regenerate the full balance report from untouched runs and legal purchases, then expand beyond seeds 1, 42, 2026, and 65537. Investigate beginner stalls at commission 8 and large late-output variance; include poor-route recovery, relaxed play, Daily, and After Hours. Preserve failing seeds. Verify capped rewards, four-token bounds, inherited visits, and timeout settlement; review whether extreme-value labels need a saturation indicator. Do not require every deliberately weak policy to win or treat a green harness exit as universal balance.

3. [ ] **Difficulty and accessibility.** Verify the unchanged Retry commission assistance (+10% base per retry, capped at +30%) and initial New Workshop relaxed option (-35% targets); Daily cannot start relaxed, and existing assisted saves retain their choice. Loss review must not offer a mid-run relaxed switch or automatically lower targets. Restart level must retain current difficulty/retries, reset only the attempt to five launches, cancel live simulation, and grant no extra bonus or reward; it stays disabled in review/shop/won. Check keyboard-only operation, focus visibility, dialog/back behavior, trails, volume/mute, text fitting, and pause/speed controls. Accessibility has separate high-contrast and reduced-motion controls; motion defaults off without OS auto-detection and preserves explicit saved `true`. Review focused height-aware full-HD/ultrawide/mobile evidence for guide, capacity, and machine-control separation, then inspect readability on target devices, including the 1280x840 default windowed size and 760x540 native minimum. Painted-pixel checks do not replace human readability testing.

4. [ ] **Actual controllers and Steam Deck.** Complete gameplay, shops, settings/sliders, menus, seed/text entry, import/export dialogs, and recovery without assuming a mouse on real standard-mapped controllers. Test held buttons, hotplug, focus loss, remapping, and platform-specific layouts. Validate the Windows depot under Proton on real Deck hardware, including 1280x800 text, touch/touchpad, suspend/resume, and offline play. Steam Input action sets are not implemented; injected Gamepad API tests do not justify Full Controller Support or Deck compatibility badges.

5. [ ] **Native saves, export, and Steam Cloud.** Refresh the complete native suite for the intended build; previous Settings export/security/save passes are recorded in [docs/VERIFICATION.md](VERIFICATION.md). Manually exercise the real Windows file picker, cancellation, overwrite, and write errors. Check version-1 imports with optional `tutorialStep` and literal-1 `fullscreenPreferenceVersion`, legacy `seenTutorial`, interrupted-drop refund, corrupt-primary recovery, shutdown draining, reinstall/upgrade persistence, and offline play. Confirm desktop load/import migrates only fullscreen and its marker, while browser-only reads do not migrate; no other settings, currency, or run state may change because of that migration. Local serialized atomic autosaves and export are unchanged, and named slots remain deferred. Real Cloud configuration and two-machine conflict/reconnection checks remain release gates; D04 investigation is open and deferred. When authorized, sync only `WinAppDataRoaming/Pocket Cascade/pocket-cascade-save.json`, keeping backups, temporary files, and caches local, and resolve the current per-Windows-user shared-save behavior across Steam accounts.

6. [ ] **Hardware, performance, and physical audio.** Play the packaged game on representative Windows hardware without development dependencies. Confirm standard fullscreen before first visibility for fresh and unmarked legacy saves, including old `false`; this explicitly authorized one-time upgrade also affects intentional pre-marker windowed choices. Verify marked `false` survives relaunch, framed/resizable window restoration, top-bar/Settings controls, and `F11`, with no display-resolution change. Stress long/high-output cascades and speed changes; bounded visuals/audio must preserve scoring and the 12-second safeguard must pay remaining tokens. Listen to passive/repeated peg and wall impacts, distinct part/payout transients, and music on real speakers/headphones at multiple levels. Defaults remain 0.65 volume and 0.28 music; menu/paused music continues at 80% of the selected gain on the same clock. Record audibility, balance, clipping, and device changes; digital PCM/headroom checks do not establish hardware results.

7. [ ] **Real Steam integration.** Use the assigned AppID and entitled partner/test accounts, never Spacewar or embedded credentials. Verify actual native initialization, unavailable/offline status, and every published achievement through game actions plus exit/relaunch. Check Steam overlay compatibility without weakening the sandbox; the overlay helper is not enabled. Preview SteamPipe manifests, upload only to a private branch, and install that branch through Steam before any public/default-branch decision. AppID 0 and mocks are not Steam success.

8. [ ] **Reproducible build, packaging, and signing.** Use `npm ci`, regenerate assets, and record a fresh build, full unit/browser/native runs, and full balance report after the final changes. Run `npm run package:dir` and `npm run package:win`; inspect and directly launch both outputs. Verify the complete unpacked depot, executable icon/version, bundled fonts, native addon/DLL when enabled, and legal resources. Signing is not configured: arrange certificate/signing/timestamp verification or explicitly approve the unsigned-distribution policy after clean-machine testing. No development URL, test data override, secrets, or sample AppID file may ship.

9. [ ] **Store presentation and captures.** Produce and inspect current gameplay screenshots, capsule/library artwork, achievement icons, trailer footage if used, and required store metadata. The original concept mockup is not a gameplay screenshot. Show the actual cabinet and representative outcomes, distinguish authored campaign content from capped After Hours, and avoid unverified playtime/controller/Deck/online claims. Review title/art rights, descriptions, supported languages, system requirements, price, and a clean Steam launch configuration; do not imply a completed store upload from local artifacts.

10. [ ] **Legal and distribution review.** Legal files are unchanged: [LICENSE.txt](../LICENSE.txt) is a private-project placeholder, not an approved player EULA, and [THIRD_PARTY_NOTICES.txt](../THIRD_PARTY_NOTICES.txt) is an input to review, not legal clearance. Obtain owner approval of distribution rights, player-facing terms, and package license metadata. Review Electron/Chromium, npm dependency, font, icon, and Steam SDK/native-binding redistribution obligations; confirm final packages include the required notices. Portable/directory targets have no installer acceptance screen, so arrange any required Steam EULA presentation and non-Steam acceptance deliberately. Do not invent a license grant, copyright owner, or legal approval.

## Local Evidence

- Original application icons, actual-play screenshots, Steam capsule/library assets, and dependency notices were generated. Review capture freshness before store use.
- Prior P01-P09 polish includes physical-impact audio, the nonblocking Quick Guide, Workshop-credit receipts and separated gifts/paid stock, manual Accessibility controls, and height-aware layout. The calculated advisor remains removed.
- Approved P10-P13 follow-ups add one-time fullscreen migration, quick restart/New Workshop controls, removal of the mid-run relaxed prompt, and inventory/capacity clarity. Initial relaxed Workshop creation and the existing loss-retry bonus remain. Economy, simulation, board dimensions, and the retained 16-run balance report are unchanged; that report was not rerun for this pass.
- Focused layout checks and screenshots cover full HD, ultrawide, and mobile without overflow. Production PCM checks at 44.1/48 kHz compare feedback above 1.6x the legacy reference with headroom; no hardware audio claim follows.
- Complete post-follow-up unit, browser, and native suites pass, including restart, inventory/capacity, and legacy display migration. Both rebuilt launchers pass actual-executable smoke checks; see [docs/VERIFICATION.md](VERIFICATION.md).
- Current executable signatures are `NotSigned`, with runtime DLLs, notices, and game assets bundled. Signing and clean-machine approval remain separate release gates.

## Pending Release Evidence

- One user playtest reported that the game feels good. Broader comprehension/enjoyment evidence, actual session length, seed coverage, and fair paid value remain open; the feedback is not proof of sales. Relaxed targets alone do not guarantee success for a badly routed build.
- P14 is complete for this local candidate. Broader release approval still requires the ten gates; local executable checks do not establish Steam or hardware certification.
- Real file-picker/manual failure flows, lower-spec clean machines, physical audio/controllers, Steam Input and Deck remain human/hardware checks.
- Steam AppID remains 0. Real Steam/Cloud, signing, distribution-rights/EULA review, store upload, and release approval remain pending.

## Record the Candidate

Maintain the candidate record in [docs/VERIFICATION.md](VERIFICATION.md) after complete verification, rather than counting individual focused reruns as a full pass. Keep user-requested status in [docs/OPEN-ITEMS.md](OPEN-ITEMS.md):

| Field | Record |
| --- | --- |
| Candidate | Package version, build date, and artifact filename/hash. |
| Environment | Windows version, CPU/GPU, Node/npm/Electron versions, display/audio/controller devices. |
| Automated checks | Commands, dates, final pass/fail/skip counts, report and trace locations. |
| Packaging | Directory/portable launch results, resource inspection, signing status, clean-machine result. |
| Human playtest | Observed seeds, assistance settings, completion/failure points, comprehension and value findings. |
| Steam | Real AppID/depot/private branch and build ID; achievement, Cloud, offline, and overlay results. |
| Release decision | Reviewed blockers, accepted limitations, legal/store approval, and responsible reviewer. |

Use the entire `release/win-unpacked` directory for the depot, launching `Pocket Cascade.exe` with working directory `.`. The version-1.0.0 portable target is `release/Pocket-Cascade-1.0.0-win-x64-portable.exe`; it is a standalone distribution artifact, not the depot launcher. Preserve a tested prior package and representative version-1 save exports for upgrade/recovery checks.

Detailed procedures: [docs/TESTING.md](TESTING.md), [docs/BALANCE.md](BALANCE.md), and [docs/STEAM.md](STEAM.md).