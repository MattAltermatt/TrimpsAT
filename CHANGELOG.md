# 📓 TrimpsAT changelog

**TrimpsAT** is an unofficial rehost of [Trimps](https://trimps.github.io/) with
[AutoTrimps](https://github.com/MattAltermatt/AutoTrimps) automation built in — not
the official game and not affiliated with its author.

Versions below track **this fork's** own changes. They are independent of the base
**Trimps** version shown in-game (currently `5.10.1`), which comes from upstream and
drives save compatibility — the fork never bumps `game.global.stringVersion`, so
saves stay importable to and from official Trimps. The three versions
(TrimpsAT · AutoTrimps · Trimps) are all shown in the in-game disclosure popover.

Format follows [Keep a Changelog](https://keepachangelog.com/); the fork uses
[SemVer](https://semver.org/) starting from `0.x` while pre-1.0.

## [Unreleased]

A batch of inherited-upstream correctness fixes plus rehost-specific cleanup.
No `game.global.stringVersion` change — saves stay cross-compatible with official
Trimps.

### 🧹 Rehost cleanup
- **Dead cloud/platform save logic removed (#4):** PlayFab online-saving cannot
  work on this origin (the bundled SDK hardcoded the official title `9186`), and
  there is no Kongregate or Steam/greenworks runtime here. Removed the vendored
  `Playfab/` directory (PlayFabSDK + bundled jQuery) and its `<script>` includes;
  guarded `enablePlayFab()` so `load()` can no longer pop the PlayFab login
  tooltip on startup; hid the dead "Online Saving" settings row via the play-shell.
  Kongregate/Steam surfaces were already inert in-browser.
- **Save-migration ladder pruned (#5):** raised `killSavesBelow` to `4` and removed
  every `load()` upgrade rung below game-version 4.0 (the entire v0.07–v3.9 chain).
  Behavior-preserving for every accepted save; imports of genuinely ancient
  official saves (pre-4.0) now fail with a clear message instead of running dead
  compatibility code.

### 🐛 Fixes (inherited upstream game bugs)
- **Wrong-comparison logic (#7):** an operator-precedence bug made a preset-5
  (Quagmire) map-at-zone guard always false; object-vs-string comparisons in
  `addBoost()` and the offline-progress calc meant Farmer/Lumberjack/Miner parity
  bonuses, Explorer exclusions, and fragment-resource guards never applied as
  intended; the Eelimp attack-speed bonus applied to un-shocked enemies.
- **Misspelled property no-ops (#8):** `soldierHealthMax` (current soldier health
  now clamps to the reduced max on map/void exit), `purchaseCount` (mutator-respec
  button guard), and spire `savedLayout1` (preset-1 layout no longer bleeds across
  imported saves).
- **Display / dead-code quirks (#9):** Wind "Swiftness" loot-breakdown base %, a
  stray empty "Rare Imps:" line, the tier-9 talent-counter seed, and a missing
  `return` in `getQuestDescription`.
- **Spire accessibility crash (#10):** screen-reader spire commands with row `0`
  (e.g. `build fire 1 0`, `read 0`) no longer crash with a negative-index
  TypeError — the row guard now mirrors the existing column lower-bound check.

## [v0.1.0] — first tagged fork release

Based on **Trimps 5.10.1** · **AutoTrimps v6.0.0.104**.

### 🏗️ Play-shell (hosted-play UI)
- Combined first-load dialog (replaces the game's Welcome popup and AutoTrimps'
  changelog), native save-import path, and the bottom-right version button
  repurposed into a disclosure + sources popover. All layered in `play/` to keep
  the upstream diff tiny. *(shipped in 89ae5ba)*

### 🛡️ Security
- **Stored XSS in the save-import path (#6):** imported/crafted saves could carry a
  perk-preset or heirloom name that reached `innerHTML`/attribute sinks unescaped
  and executed arbitrary JS (exfiltrating `localStorage.trimpSave1`). `load()` now
  sanitizes save-sourced perk-preset and heirloom names before the first render,
  on every load path (import, reload, legacy migration). Idempotent and throw-free;
  covers string, array, and object name types. This is the fork's first game-code
  change (`main.js`), kept to one contained block.

### ✨ Enhancements
- **Automation load-failure handling (#2):** if the external AutoTrimps bundle fails
  to load, the page now shows an explicit "automation offline" label + notice
  instead of a misleading empty-version label, and stays manually playable.
- **Dynamic tab title (#3):** the browser tab now shows current zone + helium/radon,
  e.g. `Z452 · 1.24No He · TrimpsAT`.

### 🐛 Fixes
- **Import robustness (#1):** null-guard the "Load from file" reader against a
  torn-down import dialog, and raise the first-load modal backdrop / sources popover
  z-index to the 32-bit ceiling so game overlays no longer bleed in front of them.

[v0.1.0]: https://github.com/MattAltermatt/TrimpsAT/releases/tag/v0.1.0
