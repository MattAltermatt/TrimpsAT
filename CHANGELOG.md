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
