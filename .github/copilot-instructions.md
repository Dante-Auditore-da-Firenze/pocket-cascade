# Pocket Cascade

- Do not initialize a Git repository, create branches, or commit without explicit permission.
- Read `docs/HISTORY.md` (especially the latest entries) and `docs/OPEN-ITEMS.md` at the start of each chat and after context compaction before acting. Append a dated entry to the same history after every substantive exchange, including discussion-only turns, before the final response. Capture user requests, proposals versus approvals, decisions/reversals, changes, actual validation, and open items. Preserve earlier history; record later corrections or reversals explicitly. Do not log secrets or claim unavailable chat history.
- Keep `docs/OPEN-ITEMS.md` current. Mark items resolved only with an implemented/validated outcome or an explicit decision; leave deferred endgame, theme, and Steam-save work untouched until approved.
- Read the local controlling implementation before changing it. Preserve unrelated user changes.
- The authoritative rules live in `src/game`; browser, desktop, and balance scripts share `DropSimulation`.
- Use Matter.js at 120 Hz. Launch conditions stay deterministic across an entire run.
- Excess payout is success. Keep earned-value accounting separate from visual/audio limits.
- Physical-impact audio is ephemeral feedback, not saved scoring. Keep music continuous in menus; reduced motion is opt-in. Do not reintroduce calculated machine suggestions.
- Use `apply_patch` for source edits. Run the narrowest affected executable test immediately afterward.
- `npm test` covers rules and boundaries. `npm run test:e2e` covers actual UI play. Build before `npm run test:desktop`.
- `npm run test:balance` generates the full 16-run report; `--quick` overwrites it with two runs. Only spend earned currency.
- `npm run package:win` builds portable and unpacked Windows outputs. `npm run test:package` launches both actual executables using the ordinary player save location without changing the run.
- Keep renderer isolation, CSP, trusted-frame IPC, and native save/export validation intact.
- Steam AppID 0 is intentionally unconfigured. Never claim real Steam, hardware audio, controller, or Deck verification based on mocks.
- Use existing palette variables, local fonts, original artwork, and lucide-react UI icons. No external runtime assets, analytics, payments, or network-required gameplay.

## Setup Status

- [x] Research reviewed; minimum-target combo-builder direction selected.
- [x] Game, progression, desktop shell, audio, saves, assets, and tests implemented.
- [x] Local development task running; no editor extensions required.
- [x] Production build and native/browser workflows validated.
- [x] Windows portable and unpacked executables built and launched.
- [x] Design, balance, testing, and release documentation included.
- [ ] Human playtest, real Steam/Cloud testing, hardware certification, signing, and legal/store approval.