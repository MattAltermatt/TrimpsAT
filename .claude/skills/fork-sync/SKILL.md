---
name: fork-sync
description: Sync TrimpsAT with upstream Trimps — fetch and merge upstream/master, verify the fork diff stays tiny, and note the rebase in CHANGELOG. Lets stringVersion become upstream's value for free. User-invoked only.
disable-model-invocation: true
---

# Sync TrimpsAT with upstream Trimps

Pull the latest official Trimps into the fork while preserving the fork's tiny, ~5-file surface.
The whole point of keeping the diff small is that this stays a clean fast merge.

## Before you start

- Confirm a clean tree on `master` (`git status`). Stop and surface if dirty.
- Remember: `gh` resolves the DEFAULT repo to **upstream** here — any `gh` call needs
  `-R MattAltermatt/TrimpsAT`. Plain `git` remote ops are unaffected.

## Steps

1. **Fetch upstream.** `git fetch upstream` (remote `upstream` → `Trimps/Trimps.github.io`).
   Show `git log --oneline master..upstream/master` so the user sees what's incoming.
2. **Merge.** `git merge upstream/master`. Expect it to be clean or near-clean — the fork only
   diverges in `play/play-shell.js`, `play/play-shell.css`, ~7 lines of `index.html`, a sanctioned
   block in `main.js`, and the fork-only `CHANGELOG.md`.
3. **Resolve conflicts (if any) — the fork side is a thin overlay.** Conflicts should only ever
   appear in the sanctioned surface. Take upstream's changes and re-apply the fork's thin
   overlay on top; never drop the play-shell wiring or the `main.js` save-import sanitize.
   If a conflict appears in an upstream monolith the fork shouldn't touch (`config.js`,
   `objects.js`, `updates.js`, …), that's a signal the fork wrongly diverged there — flag it.
4. **Let stringVersion float.** `game.global.stringVersion` should now be upstream's NEW value.
   That's correct and intended — do NOT revert it. (This is the one place stringVersion legitimately
   changes; it flows in from upstream, never a manual fork bump.)
5. **Audit the surface.** Run `git diff --stat upstream/master` (or dispatch the
   `fork-diff-auditor` subagent) to confirm the fork footprint is still just the sanctioned files.
6. **Note the rebase in CHANGELOG.** Add/update the current section with
   `Based on **Trimps <new stringVersion>** · **AutoTrimps <ATversion>**.` and a
   "rebased on Trimps X.Y.Z" note.
7. **Verify save-import still works.** The play-shell's reason to exist is importing saves; a
   stringVersion bump from upstream must not break it. Do a quick Chrome check of the import path
   (or at minimum reason through `load()` around main.js ~307) before declaring done.
8. **Push** only with explicit user go (`git push origin master`).

## Why this is safe

The fork never bumps stringVersion itself and its `main.js` sanitize is idempotent / a no-op on
legit data, so fork saves stay cross-compatible with official Trimps across a sync. If a merge
ever wants to rewrite large upstream files, stop — the tiny-diff invariant is the thing keeping
these syncs cheap.
