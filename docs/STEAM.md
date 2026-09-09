# Pocket Cascade Desktop and Steam Release

The desktop entry is [electron/main.cjs](../electron/main.cjs). The package currently declares version **1.0.0**; runtime status uses Electron's `app.getVersion()`, and artifact versions come from package metadata. There is no release certificate, Steamworks credential, or assigned Steam AppID in this implementation.

## Current Status and Release Gates

Pocket Cascade is a playable desktop and browser game candidate, not a certified or commercially validated Steam release. As of 2026-09-07, P10-P14 are complete: the full post-follow-up suites pass and both rebuilt Windows executables were launched successfully. [docs/VERIFICATION.md](VERIFICATION.md) records current evidence and hashes; [docs/OPEN-ITEMS.md](OPEN-ITEMS.md) is the authoritative tracker. Real Steam integration, Cloud, store upload, signing, and hardware compatibility remain release checks.

- [package.json](../package.json) declares `steamworks.js` 0.4.x as an optional dependency and Electron 43.4.x. The adapter follows the upstream API below; standalone play does not require Steam.
- The Windows builder references [assets/icon.ico](../assets/icon.ico). Verify the generated icon, executable resources, and complete packaged directory before distributing a build. Configured output paths are not evidence that packaging has passed.
- Keep [public/theme.js](../public/theme.js) as the external first script in the renderer's HTML head. Preserve the ordinary Vite HTML prefix: doctype, `html`, then an attribute-free `head`. The native loader rejects an unexpected prefix instead of risking a misplaced CSP.
- Save initialization must complete before autosaving. The renderer validates version-1 game data and reports recovery or persistence failures; native tests wait for renderer readiness and the initial native save before reloads or writes.
- Generated [THIRD_PARTY_NOTICES.txt](../THIRD_PARTY_NOTICES.txt) and private-project [LICENSE.txt](../LICENSE.txt) are bundled in `resources/legal`. These legal files are unchanged; the license placeholder is not an approved player EULA. Package metadata is `UNLICENSED`, not an open-source license grant. Distribution rights, player-facing terms, and Steam SDK terms still require owner approval; notice generation does not establish legal clearance.
- Portable and directory builds have no installer license-acceptance screen. Configure any required EULA presentation in Steamworks and arrange any non-Steam acceptance workflow separately. Retain Electron/Chromium and dependency notices, and review Steam SDK redistribution terms.
- Use an assigned production AppID and authorized partner/test accounts for Steam verification. AppID 0 intentionally reports unconfigured integration and must not be replaced with a sample-game ID.

## Display and Accessibility

Before creating the window, native startup honors the fullscreen boolean only when `save.settings.fullscreenPreferenceVersion` is 1. Fresh saves set `fullscreen: true` and that marker; an unmarked legacy `true` or `false` starts in standard Electron fullscreen once. Intentional legacy windowed choices are indistinguishable from the old false-default bug, so this one-time upgrade of both was explicitly user-authorized. After migration, marked windowed choices are remembered.

Renderer native load/import applies `migrateDesktopSave` and autosaves the result. It changes only fullscreen and the optional literal-1 marker, leaving other settings, the run, currency, and profile intact. Browser-only parsing/loading does not migrate. There is no save-version bump. The window uses `frame: true`: native fullscreen hides chrome, while windowed mode restores the native frame and resizing. No exclusive fullscreen or display-resolution change is requested. Windowed dimensions remain 1280x840 by default, with a 760x540 minimum.

Top-bar and Settings mode buttons, plus `F11`, switch modes. Reduced motion and high contrast live in a separate Accessibility dialog. Reduced motion defaults off, never follows the OS preference automatically, and preserves an explicitly saved `true` setting. Height-aware board sizing changes presentation only, not physical geometry; see [docs/DESIGN.md](DESIGN.md).

## Build and Test on Windows

Use the project's supported Node.js toolchain and installed dependencies on a Windows x64 machine. Native Playwright tests need an interactive desktop and an installed Electron binary; they do not start Vite or use a development URL. Do not disable the sandbox to make a test environment work.

```powershell
npm ci
npm test -- tests/electron-main.test.ts tests/display-preferences.test.ts
npm run build
npm run test:desktop
npm run desktop
npm run package:dir
npm run package:win
```

The existing scripts select [electron-builder.yml](../electron-builder.yml). Outputs are:

- `release/win-unpacked/`, with `Pocket Cascade.exe`, its helper binaries, and the complete resources directory. This is the **Steam depot content**, not an installer.
- `release/Pocket-Cascade-1.0.0-win-x64-portable.exe` for the current package version. Future versions change that filename automatically. Use the portable artifact for standalone distribution, not as the Steam depot launcher.

Both targets are Windows x64. `asar` is enabled, with the optional native Steam package unpacked. [electron/after-pack.cjs](../electron/after-pack.cjs) checks the published Windows addon and copies `steam_api64.dll` from `steamworks.js/dist/win64` beside the executable when the optional package is installed. The source and packaged addon must both be present. A nonzero configured AppID with no optional dependency fails packaging explicitly. With AppID 0 and no dependency, standalone packaging skips that step.

`forceCodeSigning: false` permits unsigned builds without a signing account. Executable resource editing stays enabled so the icon and version resources can be applied. No certificate is configured and no signed release is claimed. If signing credentials are independently supplied to the build environment, electron-builder may use them; otherwise Windows can show an unknown-publisher or SmartScreen warning. Actual certificate procurement, signing, timestamping, and clean-machine verification remain release work.

### Test Scope

[tests/electron-main.test.ts](../tests/electron-main.test.ts) covers bounded JSON input, temporary-file replacement, ordered saves and backups, corrupt-file recovery, explicit I/O failures, close draining, trusted-frame IPC, navigation and permission denial, the exact preload surface, CSP insertion, file containment, fullscreen behavior, dialog-backed export, and Steam adapter mocks. It uses temporary directories, not the player's save directory.

[playwright.electron.config.ts](../playwright.electron.config.ts) runs only `tests/native/*.native.ts`, outside the default Vitest and Playwright `.test`/`.spec` patterns. Native tests launch actual Electron against the built output, clear `POCKET_CASCADE_DEV_URL`, force Steam AppID 0, and isolate `userData`. Coverage includes renderer readiness, fresh/unmarked fullscreen startup before visibility, marked preferences, one-time legacy migration followed by a remembered windowed choice across relaunch, native frame restoration, CSP enforcement, blocked popups/navigation/file access, actual save bytes across relaunch, queued writes immediately followed by quit, Settings export, and a real token launch. Output goes under `tests/native/.results`.

The calculated advisor remains removed; loss review also omits the mid-run relaxed-target choice, while the existing Retry commission bonus remains. Complete native verification includes legacy fullscreen migration and relaunch. Both rebuilt packages pass `npm run test:package`; current evidence and hashes are in [docs/VERIFICATION.md](VERIFICATION.md) and [artifacts/release/verification.json](../artifacts/release/verification.json). The export test controls the dialog response; separately exercise the physical Windows picker, cancellation, and overwrite confirmation. Native Steam, Cloud, overlay, physical audio/controllers, and Deck require real-system testing.

## Renderer API

The isolated preload exposes only `window.pocketDesktop`. Its exported type is [electron/desktop-api.d.ts](../electron/desktop-api.d.ts). No raw IPC, Electron objects, filesystem paths, player identity, or Node primitives are exposed.

```typescript
interface PocketDesktop {
  readSave(): Promise<{ data: string | null; recovered: boolean; error?: string }>;
  writeSave(json: string): Promise<{ ok: boolean; error?: string }>;
  exportSave(json: string): Promise<{ ok: boolean; canceled?: boolean; error?: string }>;
  setFullscreen(value: boolean): Promise<boolean>;
  getStatus(): Promise<{ platform: string; version: string; steam: boolean; steamError?: string }>;
  unlockAchievement(id: string): Promise<boolean>;
  quit(): void;
}
```

`setFullscreen` resolves to the actual native fullscreen state, so a successful exit resolves to `false`. Invalid non-boolean arguments are rejected. `quit()` is one-way; normal close, OS session-end requests, and application quit all wait for already accepted save work. Forced process termination, power loss, and an OS-imposed termination deadline cannot be made graceful by an application.

Both write and export accept a JSON **string** of at most **2,097,152 UTF-8 bytes**. Its root must be an object with numeric `version: 1` and non-null, non-array `run`, `profile`, and `settings` objects. This is an envelope guard, not game-state validation. The renderer's Zod schema remains responsible for nested fields, value ranges, supported versions, and interrupted-run recovery.

`exportSave` validates before opening a parented native save dialog. It suggests a dated JSON filename in the user's Documents directory, offers the JSON filter and overwrite confirmation, and writes only to the absolute path returned by the confirmed dialog. The renderer sends data, never a path. Cancellation returns `{ ok: false, canceled: true }`; dialog/write failures return an explicit error, not success. This user-requested export is separate from the serialized atomic primary/backup save store; do not describe export replacement as atomic backup rotation.

Save results distinguish the following cases:

| Case | Result |
| --- | --- |
| No primary and no backup on first launch | `data: null`, `recovered: false`, no error |
| Valid primary | Original JSON string, `recovered: false` |
| Primary missing, corrupt, or unreadable; valid backup | Backup JSON, `recovered: true`, an explanatory primary error |
| Neither file is usable | `data: null`, `recovered: false`, explicit error |
| Invalid input, disk failure, or write requested during shutdown | `ok: false`, explicit error |

An error must not be silently treated as a new game. On normal shutdown, the main process also displays the latest uncorrected write failure. There are no renderer-selected filesystem paths or general-purpose file-operation IPC endpoints; the seventh preload method is limited to validated, dialog-approved save export.

## Security and Development

The window explicitly enables `sandbox`, `contextIsolation`, and `webSecurity`; it disables Node integration, Node in workers/subframes, webviews, insecure mixed content, and drag-to-navigate. All renderer-initiated document navigation, redirects, popups, downloads, permission requests/checks, device permissions, and display capture are denied. Production devtools are disabled.

Every IPC call checks the expected main window's `webContents`, the current non-detached top-frame identity, and both frame and main-document URLs. Only the exact built index URL, or exact configured development page URL, is trusted. Same-origin subframes and unrelated files are not trusted. Fragments do not grant a different document privileges; query/path changes are rejected.

For built files, the session's file handler serves only real files under `dist`, checks resolved paths to reject symlink escapes, and injects a CSP meta tag immediately after the validated opening head. Electron's security documentation notes that ordinary CSP response headers do not protect `file://` documents, so this implementation does **not** rely on headers alone.

```text
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; worker-src 'self'
```

Keep production scripts, fonts, styles, sounds, and images in the built assets. Inline scripts, eval, remote resources, frames, and form submissions are not permitted. Existing renderer CSP policies can only further restrict this policy.

For an already running Vite instance, an unpackaged launch may opt into exactly `http://127.0.0.1:PORT`, optionally ending in `/`:

```powershell
$env:POCKET_CASCADE_DEV_URL = 'http://127.0.0.1:5173'
npm run desktop
Remove-Item Env:POCKET_CASCADE_DEV_URL
```

No server is started by the shell. Host aliases, credentials, remote hosts, paths, queries, fragments, and other protocols are rejected. Development allows Vite's inline bootstrap and the same host/port WebSocket, without relaxing the sandbox or IPC checks. Packaged apps ignore this variable entirely.

`POCKET_CASCADE_DATA_DIR` is an absolute-path override **only for unpackaged integration testing**. Packaged apps ignore it. Both `userData` and Chromium's `sessionData` are assigned to that directory, so tests cannot reuse the normal browser profile. Without an override, both use the stable `appData/Pocket Cascade` directory. Do not set the override for ordinary play or Cloud testing. A single-instance lock prevents concurrent normal processes from racing on the same profile's files.

## Steam Configuration and Honest Status

Steamworks requires an authorized **Steamworks partner account**, your **own assigned AppID**, the relevant app/depot permissions, and a Steam account entitled to test the app. None of these can be provisioned or verified from this workspace. An AppID is public configuration, not a credential; never embed account passwords, API keys, Steam Guard codes, or build-account tokens.

[electron/steam-config.json](../electron/steam-config.json) ships with numeric `appId: 0`, meaning **unconfigured**. Replace it with the real numeric AppID before a Steam release. Alternatively, `POCKET_CASCADE_STEAM_APP_ID` accepts a decimal unsigned 32-bit AppID at runtime; an explicit `0` disables integration. Invalid values are reported, not silently replaced. A build-time environment variable does not rewrite or bake a value into the JSON configuration.

The main process lazily loads optional `steamworks.js` and calls `init(appId)` only for a configured nonzero ID. It uses the actual upstream `client.localplayer.getSteamId()`, `client.utils.getAppId()`, `client.achievement.isActivated(id)`, and `client.achievement.activate(id)` APIs. It does not invent `localPlayer`, `isLoggedOn`, shutdown, or success APIs. The upstream library manages its callback pump; process exit ends it.

The game remains launchable with no Steam installation, a stopped Steam client, missing native binaries, an incompatible binding, or unavailable app access. `getStatus()` returns `steam: false` and a specific `steamError` for unavailable or unconfigured integration. `steam: true` means a usable initialized native client for the configured AppID, not proof of online connectivity, Cloud synchronization, overlay support, or remote achievement delivery. An achievement error can accompany `steam: true` if that session rejected an operation.

An unlock returns `true` only when the native API confirms it is already activated or returns boolean `true` from activation. False, exceptions, unknown IDs, and non-boolean native results never become success. The renderer retains locally earned achievements and reattempts them when a later session initializes Steam; it does not persist a separate native acknowledgement queue. There is no fake achievement cache in the shell, no Spacewar/sample-game fallback AppID, and no forced Steam restart or login prompt.

The Steam overlay helper is deliberately not enabled: upstream's helper changes GPU process/composition behavior, and its renderer examples disable isolation. This application keeps native Steam calls in the main process and retains the sandbox. Overlay compatibility must be investigated and verified separately without weakening those protections.

## Achievement Schema

In Steamworks, create these ten client-set achievements, publish the schema to the test app, and supply appropriate locked/unlocked icons and localization. Use the exact API names below, with initially unachieved values. No Steam statistic is required by this implementation. Names and conditions are taken from [src/game/content.ts](../src/game/content.ts); the unit test detects whitelist drift.

| API Name | Display Name | Description |
| --- | --- | --- |
| `FIRST_CASCADE` | Small Beginnings | Complete your first commission. |
| `FOUR_TOKENS` | Family Tree | Create four tokens in one launch. |
| `CHAIN_EIGHT` | Well Connected | Trigger eight parts with one token. |
| `THOUSAND_DROP` | Pocket Money | Earn 1,000 points in one launch. |
| `TEN_THOUSAND_DROP` | Extraordinary Interest | Earn 10,000 points in one launch. |
| `OVERDRIVE` | And Then Some | Finish a commission at twice its target. |
| `ALL_PARTS` | The Whole Collection | Discover all eight parts. |
| `WORKSHOP_COMPLETE` | Look What You Made | Finish all twelve commissions. |
| `DAILY_COMPLETE` | A Good Day's Work | Complete a daily machine. |
| `ENDLESS_FIVE` | Just One More | Complete five endless commissions. |

Only those IDs reach the native API. Verify each through actual game actions with an authorized test account, then check Steam's achievement view after exit/relaunch. Mock and AppID-0 tests are not Steam achievement verification.

## Save Location and Steam Auto-Cloud

The fixed primary save is `userData/pocket-cascade-save.json`, with `pocket-cascade-save.json.bak` as the previous valid save. Default Windows storage is:

```text
%APPDATA%\Pocket Cascade\pocket-cascade-save.json
```

This remains outside the installation/extraction directory, including for the portable executable. The native layer serializes reads and writes, flushes each temporary file, and atomically renames within that directory. Before replacing a valid primary it atomically backs it up. A corrupt primary never replaces a good backup. Temporary files are not considered recoverable saves; interrupted process termination can leave harmless UUID-suffixed `.tmp` files.

Existing local autosaves, export, and atomic backup behavior are unchanged by the follow-ups. Version-1 profiles accept optional `tutorialStep` for the Quick Guide while preserving legacy compatibility and `seenTutorial`; settings accept the optional fullscreen marker described above. There is no save-version or storage-path change.

There is still one active workshop per storage profile. New Workshop confirmation replaces that run while preserving profile/settings; cancellation does not replace it. Profile history records seeds and results, not full restorable workshops. Named save slots are unimplemented and deferred as D06, with no workshop database, autosave/export redesign, or Steam Cloud change.

Steam Auto-Cloud is **not configured**. D04, the Steam-specific autosave/Cloud investigation, remains **Open / Deferred** in [docs/OPEN-ITEMS.md](OPEN-ITEMS.md); local autosave support is not evidence of Cloud integration. For future authorized setup, configure **Steam Auto-Cloud** in the real app's Steamworks settings:

| Setting | Value |
| --- | --- |
| Root | `WinAppDataRoaming` |
| Subdirectory | `Pocket Cascade` |
| Pattern | `pocket-cascade-save.json` |
| OS | Windows |
| Recursive | No |
| Suggested initial quota | At least 8 MiB per user and 8 files, then verify against Steamworks limits |

Sync the primary only. Keep `.bak`, temporary files, Chromium caches, and other userData contents local. Do not configure a whole-directory wildcard. Auto-Cloud is independent of this adapter; there is no custom Steam Remote Storage implementation. Steam generates its own Auto-Cloud metadata when configured.

The current save is per OS user, **not per Steam account**. Two Steam accounts using the same Windows profile share that local save. Decide whether that is acceptable before release; per-account migration would be a separate renderer/storage design change.

Test real first launch, normal quit, offline play followed by reconnection, conflict resolution on two machines, corrupt-primary backup recovery, and interrupted shutdown. Neither Cloud nor conflict resolution has been verified here. For future native Linux/macOS builds, explicitly configure matching platform roots and test migrations; this configuration ships Windows only. For Steam Deck through Proton, inspect and test the actual Windows compatibility-prefix path instead of assuming a native Linux save location.

## SteamPipe Build and Depot Upload

1. In Steamworks, create/identify the Windows depot for your real app, assign it to the appropriate testing package, and give an authorized build account access. Download Valve's Steamworks SDK/SteamPipe tools through your partner account.
2. Verify the full renderer/native suite, generated icon, included legal files, installed optional native dependency, and real AppID configuration. Run `npm run package:dir` on Windows x64 and launch the resulting unpacked executable directly. With Steam installed and running under an entitled account, verify native status and real achievements.
3. Use the **entire** `release/win-unpacked` directory as the content root. Include all Electron helper files, `resources/app.asar`, `resources/app.asar.unpacked` when present, legal notices, and `steam_api64.dll` when Steam is enabled. Do not upload the source tree, credentials, build tools, or only the main executable.
4. Create the following VDF scripts in your Steam SDK ContentBuilder scripts directory. Replace every `YOUR_...` placeholder with your assigned IDs. The initial command is a preview: it does not upload content or select a live branch.

App build example:

```text
"appbuild"
{
  "appid" "YOUR_APP_ID"
  "desc" "Pocket Cascade 1.0.0 private verification"
  "buildoutput" "..\output"
  "contentroot" "C:\Repos\Personal\pocket-cascade\release\win-unpacked"
  "preview" "1"
  "setlive" ""
  "depots"
  {
    "YOUR_WINDOWS_DEPOT_ID" "depot_build_windows.vdf"
  }
}
```

Depot build example:

```text
"DepotBuildConfig"
{
  "DepotID" "YOUR_WINDOWS_DEPOT_ID"
  "FileMapping"
  {
    "LocalPath" "*"
    "DepotPath" "."
    "recursive" "1"
  }
  "FileExclusion" "*.pdb"
  "FileExclusion" "*.map"
  "FileExclusion" "steam_appid.txt"
}
```

5. Run SteamCMD from the SDK's appropriate builder directory. Enter secrets and Steam Guard challenges directly in your terminal; do not put them in scripts, source control, logs, or chat.

```powershell
.\steamcmd.exe +login YOUR_BUILD_ACCOUNT +run_app_build "C:\SteamSDK\tools\ContentBuilder\scripts\app_build_pocket_cascade.vdf" +quit
```

6. Inspect the preview manifest/logs, change `preview` to `0` for the actual upload, and run it again. In Steamworks Builds, select the resulting build for a **private testing branch**. Do not publish a public/default branch as part of an unreviewed build step.
7. Configure the Windows 64-bit launch option to `Pocket Cascade.exe`, working directory `.`, with no development URL, test data override, or portable launcher. Publish the required app configuration changes, install that private branch through Steam, and verify a clean-machine launch.
8. Confirm ownership/packages, EULA presentation, achievement schema, real unlocks, Auto-Cloud synchronization, save compatibility, offline behavior, uninstall/reinstall persistence, and the complete release checklist before moving a reviewed build live.

## Controller and Steam Deck Caveat

The renderer implements standard-mapped Gamepad API navigation in [src/input](../src/input): D-pad/left-stick spatial focus, LB/RB previous/next control cycling, A activation, B back, X rotation, Y launch, Start menu, and slider adjustment. Automated workflow coverage uses injected controller state; current results belong in [docs/VERIFICATION.md](VERIFICATION.md). This is not physical-controller validation.

There are no Steam Input action sets or completed Steam Deck validation. Hardware input mapping, text entry, haptics, suspend/resume, and controller-only completeness remain real-device checks. Do not claim Full Controller Support or Steam Deck Verified/Playable status from browser injection tests or the desktop shell.

On real hardware, verify every gameplay/menu/shop/settings action without a mouse, focus visibility, input remapping, readable text at 1280x800 and UI scaling, touch/touchpad behavior, fullscreen transitions, suspend/resume, offline mode, and save/Cloud behavior. Test the actual Windows depot under Proton and its native Steam runtime; a desktop Chromium test does not establish compatibility.

## References

- [Electron security checklist and file-URL CSP guidance](https://www.electronjs.org/docs/latest/tutorial/security)
- [Electron protocol handlers](https://www.electronjs.org/docs/latest/api/protocol) and [net.fetch protocol forwarding](https://www.electronjs.org/docs/latest/api/net)
- [steamworks.js upstream API](https://github.com/ceifa/steamworks.js), [client declarations](https://github.com/ceifa/steamworks.js/blob/main/client.d.ts), and [published runtime build layout](https://github.com/ceifa/steamworks.js/blob/main/build.js)
- [Steamworks SDK initialization](https://partner.steamgames.com/doc/sdk/api)
- [Steam achievements](https://partner.steamgames.com/doc/features/achievements)
- [Steam Cloud / Auto-Cloud](https://partner.steamgames.com/doc/features/cloud)
- [SteamPipe upload instructions](https://partner.steamgames.com/doc/sdk/uploading)
- [Steam Input](https://partner.steamgames.com/doc/features/steam_controller) and [Steam Deck compatibility](https://partner.steamgames.com/doc/steamdeck/compat)