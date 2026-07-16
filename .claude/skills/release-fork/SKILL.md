---
name: release-fork
description: Cut a TrimpsAT fork release — bump TRIMPS_AT_VERSION in play-shell.js, add a CHANGELOG entry, and tag vX.Y.Z. Never touches game.global.stringVersion. User-invoked only.
disable-model-invocation: true
---

# Cut a TrimpsAT fork release

TrimpsAT versions the fork **independently** of upstream Trimps. This skill performs the fixed
release ritual and guards the save-compat invariant. Ask the user for the new version if not given
(SemVer, `0.x` while pre-1.0).

## The three version identities — keep them straight

- **`TRIMPS_AT_VERSION`** — the fork's own version. This is the ONLY one this skill bumps.
  Const in `play/play-shell.js` (currently near line 39, `var TRIMPS_AT_VERSION = 'vX.Y.Z';`),
  surfaced in the disclosure popover / first-load dialog via `versionLine()`.
- **`game.global.stringVersion`** (e.g. `5.10.1`) — upstream Trimps' version and **save-compat
  machinery**. `load()` refuses saves newer than the running game. **NEVER bump it here.** It
  becomes upstream's value only via `fork-sync` (`git merge upstream/master`).
- **AutoTrimps `ATversion`** — owned by the AutoTrimps repo; not touched here.

## Steps

1. **Confirm clean state.** `git status` — release from a clean tree on `master`. If dirty, stop
   and surface it.
2. **Bump the const.** Edit `play/play-shell.js`: set `TRIMPS_AT_VERSION` to `'vX.Y.Z'`.
   Grep to confirm exactly one assignment changed and nothing else in the file moved.
3. **Guard the invariant.** `git diff` must NOT contain any `stringVersion` change. If it does,
   stop — something is wrong. (The `guard-string-version` hook also blocks this.)
4. **Add a CHANGELOG entry.** Prepend a new section to `CHANGELOG.md` at repo root, matching the
   existing Keep-a-Changelog format:
   - Heading `## [vX.Y.Z] — <one-line title>`
   - A `Based on **Trimps <stringVersion>** · **AutoTrimps <ATversion>**.` line (read the current
     values from `main.js` / the AutoTrimps loader — don't invent them).
   - Grouped bullets (🏗️ / 🐛 / 🔒 / etc.) describing what shipped since the last tag
     (`git log <prev-tag>..HEAD --oneline` to source them).
5. **Show the user** the diff + changelog draft for approval before committing.
6. **Commit** (terse subject, no trailers — e.g. `Release TrimpsAT vX.Y.Z`).
7. **Tag** an annotated tag: `git tag -a vX.Y.Z -m "TrimpsAT vX.Y.Z"`.
8. **Push** (needs explicit user go per repo rules): `git push origin master` and
   `git push origin vX.Y.Z`.

## Gotchas

- `gh` resolves the DEFAULT repo to **upstream** in this checkout — any `gh` call MUST pass
  `-R MattAltermatt/TrimpsAT` (e.g. cutting a GitHub Release). Plain `git tag`/`git push` are fine.
- The fork's changes don't alter the save FORMAT, so a release must never touch how saves are
  read/written — only the version label and changelog.
