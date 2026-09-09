# Steam Store Preparation

These are local release inputs, not a submitted or approved Steam page. Review the
release checklist and establish a fair paid offer through broader human playtesting.
[docs/OPEN-ITEMS.md](OPEN-ITEMS.md) is the authoritative user-requested work tracker;
open, deferred ideas are not promised listing features.

## Proposed Listing

**Title:** Pocket Cascade

**Short description:** Build a tiny token machine and turn loose change into extraordinary chain reactions. Arrange eight kinds of parts, split and multiply your tokens, and keep improving a little invention of your own. Twelve commissions, a daily machine, and one more cascade after hours.

**About the game:**

Start with a handful of parts and a pocketful of possibility. Mint a little value,
double it, send it through a Fork, and watch one good idea become two.

Pocket Cascade is a compact, active machine-building game. Choose where each part
belongs, learn a repeatable route, and grow your payout across twelve commissions.
The targets are minimums: doing too well is never a problem.

Each completed commission earns Workshop credits and one free part. Claim your
gift, then choose whether to spend earned credits on separate paid stock or power.
Add a useful neighbor, bank value along the way, echo a multiplier, or crown a
diverse chain reaction. Move parts for free between launches and make the machine
feel like yours.

- Eight mechanically distinct parts and a finite token-value upgrade track.
- Twelve authored commissions, with an optional capped After Hours challenge.
- Repeatable seeded machines and a shared daily seed, without a leaderboard.
- Free rewiring, retries that keep your build, and optional relaxed targets.
- An optional, nonblocking Quick Guide for placing, launching, collecting, gifts,
	and spending, with skip and Settings replay.
- A ticket-icon Workshop-credit wallet with earned/spent receipts; the free-gift
	selector disappears when claimed, with no charge.
- Offline play, automatic saves, backup recovery, and save import/export.
- Original artwork, prominent physical peg/wall impacts, distinct part and payout
	sounds, and locally synthesized music that continues through menus and pauses.
- Adjustable speed and trails, plus separate Accessibility controls for high
	contrast and reduced motion.
- Mouse, touch, keyboard, and standard-mapped controller navigation.

The guide highlights actions, not an optimal route. There is no calculated advisor,
automatic solution, or extra currency. The Workshop-credit name and shop feedback
do not change prices or the economy. Manual rewiring, part descriptions, trails,
relaxed targets, and retries retain their existing behavior.

All currency is fictional. No token purchases, real-money wagering, accounts,
analytics, or always-online requirement. Do not add promised playtime, sales,
Steam Deck badges, or Full Controller Support claims without the required evidence.

**Suggested tags:** Single-player, Casual, Strategy, Physics, Puzzle, Incremental,
Relaxing. Do not imply idle/offline earnings; progress requires active launches.
English interface only in this build.

**Price:** The research proposed USD 3.99. This remains a product decision, not a
validated price. One user playtest reported that the game feels good; this is
qualitative feedback, not proof of demand or sales. Observe more unaided players
before setting the paid offer.

## Graphical Assets

Run `npm run assets:steam` with the server at `http://127.0.0.1:5173`. It plays a
legal campaign in an isolated browser, captures gameplay, generates original
title artwork, and checks dimensions. It does not replace the player's saves.

| File Under assets/steam | Dimensions | Use |
| --- | --- | --- |
| header-capsule.png | 920 x 430 | Store header |
| small-capsule.png | 462 x 174 | Small capsule |
| main-capsule.png | 1232 x 706 | Main capsule |
| vertical-capsule.png | 748 x 896 | Vertical capsule |
| library-capsule.png | 600 x 900 | Library capsule |
| library-header.png | 920 x 430 | Library header |
| library-hero.png | 3840 x 1240 | Text-free library hero |
| library-logo.png | 1280 x 500 | Transparent logo |
| screenshots/commission-01.png | 1920 x 1080 | Actual gameplay |
| screenshots/commission-03.png | 1920 x 1080 | Actual gameplay |
| screenshots/commission-05.png | 1920 x 1080 | Actual gameplay |
| screenshots/commission-08.png | 1920 x 1080 | Actual gameplay |
| screenshots/commission-12.png | 1920 x 1080 | Actual gameplay |
| achievements/*.png | 256 x 256 | Unlocked/locked icons |

Achievement icons share the original machine insignia; unique illustrations are
an optional polish pass. The manifest records generation source and gameplay seed.
Gameplay images are unmodified captures, not the research concept mockup. In-game
notifications may appear because these images record real play; review each image.
Existing captures may predate the latest guide, wallet, and cabinet-layout polish.
Review or refresh them against the intended build before store use; their presence
does not establish a current-build pass.

Sizes were checked against Valve's public documentation during this build:

- https://partner.steamgames.com/doc/store/assets/standard
- https://partner.steamgames.com/doc/store/assets/libraryassets

Confirm current upload requirements, safe areas, small-logo readability, screenshot
suitability flags, and localization when preparing the actual page. No trailer or
store upload is claimed.

## Technical Listing

The target remains Windows x64, version 1.0.0. Both executables were rebuilt from
the polish source and launched locally; current build/package evidence is in
[docs/VERIFICATION.md](VERIFICATION.md), with recorded hashes in
[artifacts/release/verification.json](../artifacts/release/verification.json).
The browser option does not establish a SteamOS or macOS depot.

Fresh desktop saves open in standard Electron fullscreen before the window appears;
a missing preference also defaults to fullscreen, while explicit saved windowed
mode is honored. Top-bar/Settings controls and `F11` switch to a framed, resizable
window. No exclusive display mode or resolution change is requested. Reduced
motion defaults off without automatic OS preference detection, and an explicitly
saved enabled setting is retained. The larger, height-aware cabinet changes no
physical geometry; focused full-HD, ultrawide, and mobile layout checks found no
overflow.

Audio defaults remain 65% volume and 28% music. Menu/paused music keeps the same
clock at 80% of the selected gain. Stronger production PCM feedback and headroom
checks are digital evidence, not physical speaker or headphone verification.

Suggested initial test baseline, not certified minimum requirements: Windows 10/11
x64 supported by the chosen Electron runtime, 4 GB RAM, Chromium Canvas2D-capable
graphics, and 1 GB free disk including portable extraction headroom. Measure on a
lower-spec clean machine before publishing requirements.

Do not enable verified Steam achievements, Cloud, controller, or Deck feature
claims until the real AppID and hardware checks pass. Local implementations alone
do not establish platform certification. AppID 0 remains unconfigured; existing
atomic local autosaves are not Steam Cloud. The Steam-specific autosave/Cloud
investigation and dedicated-music proposal remain open and deferred in the tracker.

Legal files are unchanged. [LICENSE.txt](../LICENSE.txt) remains a private-project
placeholder, not an approved player EULA; generated
[THIRD_PARTY_NOTICES.txt](../THIRD_PARTY_NOTICES.txt) does not establish legal
clearance. Distribution rights, player-facing terms, and legal/store approval
remain pending.