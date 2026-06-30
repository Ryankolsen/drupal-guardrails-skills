---
name: drupal-core-update
description: Update Drupal core to a new patch or security release via Composer. Use when the user asks to update/bump Drupal core, references an SA-CORE advisory, mentions a target core version (e.g. "11.3.7 -> 11.3.8"), or says "drupal core update" / "drupal security release".
---

# Drupal Core Update

End-to-end workflow for upgrading Drupal core. The goal: a single, reviewable
commit that bumps core (and only core), with db updates run and any
*core-induced* config drift captured.

## Workflow

1. **Read the release notes first.** Fetch `https://www.drupal.org/project/drupal/releases/{TARGET_VERSION}` (WebFetch) before doing anything. Surface to the user:
  - Security advisories fixed (SA-CORE-YYYY-NNN) and their CVE IDs
  - **Regressions or "skip this release" notices** — e.g. 11.3.7 had a config-import regression and sites were told to jump to 11.3.8
  - Any explicit upgrade caveats called out in the notes
2. **Confirm preconditions.**
  - Working tree clean (`git status`)
  - On a branch (not the trunk). If on the default branch, branch first.
  - Note the current version: `grep -A1 '"name": "drupal/core",' composer.lock | head -4`
3. **Run the scoped composer update.** Use the explicit package list — the `drupal/core-*` glob does NOT match `drupal/core` itself:
   ```
   ddev composer update drupal/core drupal/core-recommended drupal/core-composer-scaffold drupal/core-dev --with-all-dependencies
   ```
4. **Verify the version landed:**
   ```
   grep -A1 '"name": "drupal/core",' composer.lock | head -4
   ```
5. **Run database updates:**
   ```
   ddev drush updb -y
   ```
   Pending updates from unrelated contrib modules may run — that's fine, but call them out to the user.
6. **Inspect config drift:**
   ```
   ddev drush cex --diff -y
   ```
   Then `git status` and `git diff config/sync`. Triage every changed file:
  - **Core-induced drift** (new keys in `views.settings.yml`, schema-driven additions to existing core config) → keep, include in this commit.
  - **Unrelated drift** (modules enabled previously but never exported, content-model config changes) → revert from this commit and flag for separate handling.
  - **Deletions** → never silently. Look at what's being deleted; if you didn't intend it, stop and ask.
7. **Run static analysis** (binaries come from `drupal/core-dev`):
   ```
   ddev exec vendor/bin/phpstan analyse web/modules/custom
   ```
8. **Commit** core + lockfile + any core-induced config drift in one logically-grouped commit (see template).
9. **Do not push.** `git push` is blocked by a local hook; hand the push back to the user.

## Commit message template

```
Update Drupal core {OLD} -> {NEW} (SA-CORE-YYYY-NNN, SA-CORE-YYYY-MMM)

{One-line summary of the release type — e.g. "Security patch addressing two XSS vulnerabilities:"}
- CVE-YYYY-NNNN: {short description from release notes}
- CVE-YYYY-MMMM: {short description from release notes}
```

For non-security patch releases, drop the SA-CORE suffix from the subject line and
replace the CVE bullets with a brief summary of fixes worth highlighting. End the
message with the repo's `Co-Authored-By` trailer.

## Common gotchas

- **`drupal/core-*` glob misses `drupal/core`.** The package name has no hyphen-suffix. Always list it explicitly.
- **`--with-all-dependencies` can move transitive deps** (symfony/*, guzzle, doctrine). For a Drupal patch release these usually stay put, but inspect the lock diff — if a major Symfony version moved, that warrants its own change.
- **Watch for cascade-deletes on export.** If `cex` shows unexpected config deletions (some contrib modules can trigger this), stop and investigate before committing.
- **Patches still apply.** Composer prints "Applying patches for drupal/core" — confirm all listed patches succeeded. A failed patch hunk means a core file moved and the patch needs refreshing (use the `create-patch` skill).
- **Pre-existing module drift.** New entries in `core.extension.yml` for modules not previously exported are NOT caused by the core update — revert them from this commit.

## What this skill does NOT cover

- Major or minor version upgrades (10 → 11, 11.2 → 11.3). Those need their own plan: deprecation review, contrib compatibility audit, dedicated PRD.
- Contrib module updates. Bundle those into separate changes.
- Custom module fixes triggered by the upgrade. Land core first; fix breakage in follow-ups.
