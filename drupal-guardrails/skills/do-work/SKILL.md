---
name: do-work
description: "Execute a unit of work end-to-end in a Drupal 11 + DDEV project: plan, implement (red/green kernel TDD for module logic, SDC-first for UI), validate with phpcs/phpstan/phpunit and config capture, then commit. Also holds the \"which skill to reach for\" decision map and the Git/config, Twig, SDC, and caching guardrails. Use when doing work, building a feature, fixing a bug, implementing a phase from a plan, making code changes, or planning work."
---

# Do Work

Execute a complete unit of work: plan it, build it, validate it, commit it. These
complement the repo-root `CLAUDE.md` (the authoritative guardrails).

## Reach for these skills first

When a task matches one of these, delegate to it before improvising.

| Task | Skill |
|------|-------|
| Creating a content type, bundle, or vocabulary (with its fields) | `create-content-type` |
| Adding a field to an *existing* bundle | `adding-fields` |
| Building a new View — listing page, block, or related-items list | `build-a-view` |
| Editing an existing View's YAML | `editing-views` |
| Building/registering a Single Directory Component for Canvas | `add-canvas-sdc` |
| Seeding content from a committed fixture | `seed-content-from-fixture` |
| Setting up PHPUnit / writing kernel tests | `test-module` |
| Patching a contrib or core file | `create-patch` |
| Reviewing a diff before a PR | `drupal-code-review` |
| Updating Drupal core | `drupal-core-update` |
| Committing changes | `commit` |

## Workflow

### 1. Understand the task

Read any referenced plan, PRD, or issue. Explore the codebase for the relevant
files, patterns, and conventions. If scope is ambiguous, ask the user before
proceeding.

### 2. Plan (optional)

If the task has not already been planned, plan it — non-trivial work flows
PRD → multi-phase plan → tracer-bullet slice (`build-feature` for the slicing).

### 3. Implement

**Environment.** Drupal 11 under DDEV — run every CLI command through DDEV
(`ddev drush …`, `ddev composer …`, `ddev exec …`). Custom code lives in
`web/modules/custom/`; your active theme (SDCs in `components/`) in
`web/themes/custom/<theme>`. Contrib/core (`web/core`, `web/modules/contrib`, …)
are Composer-managed and gitignored — **never edit in place; patch via `create-patch`**.

**What needs a test.** Editing **custom code** (modules, services, plugins,
custom Views filters/handlers) → **write or extend a kernel test** for it. Editing
**configuration only** (content types, fields, vocabularies, view modes, Views
YAML, block placement) → **no test needed**; config is declarative, and the
`ddev drush cim -y` round-trip in Validate is its proof.

**Design for testability.** Put logic in **small, named, injectable units** —
service classes, plugins, value objects — with dependencies injected, not fetched
via `\Drupal::`. Keep hooks, controllers, and `*_preprocess_*()` thin pass-throughs.
This is what makes the red/green loop below possible: each unit is exercised by a
fast kernel test in isolation.

**Module logic (PHP) — strict red/green/refactor:** one kernel test at a time,
tracer-bullet style — thinnest end-to-end slice first, widen one dimension per
test. Write exactly ONE test, watch it fail (red), write the minimum to pass
(green), then the next; refactor at the end with tests green. Full slice order +
discipline: [REFERENCE.md](REFERENCE.md). `test-module` has the kernel-test setup.

**Presentational UI (Twig / SDC / CSS) — implement directly** (no TDD), SDC-first:

- An SDC is the **default** for presentational UI — prefer it over an ad-hoc
  template or custom render element. A component is a trio under
  `web/themes/custom/<theme>/components/<name>/` (`<name>.component.yml` /
  `.twig` / `.css`).
- Map entity fields to props in a preprocess hook, then forward:
  `{{ include('<theme>:<component>', props) }}`. Keep the mapping out of Twig.
  For Canvas, follow `add-canvas-sdc`.
- **Twig = presentation only** — no querying/entity-loading/business logic in
  `.twig`; render complete fields (never `#markup`/`|raw`); isolate includes with
  `with_context = false`. Numbered rules: [REFERENCE.md](REFERENCE.md).
- **Caching:** use cache metadata APIs, never inline tag strings
  (`$build['#cache']['tags'][] = 'node:' . $id`). Patterns: [REFERENCE.md](REFERENCE.md).

### 4. Validate

Run the feedback loops; fix and repeat until all pass cleanly:

```bash
ddev drush cr                       # rebuild cache
ddev exec composer phpcs            # Drupal + DrupalPractice (exact cmd: REFERENCE.md)
ddev exec composer phpstan          # static analysis
ddev exec phpunit -c phpunit.xml    # kernel tests need no DB server
```

**Capture config** after changing any content type, field, vocabulary, view mode,
or View (these are *configuration*, not content):

```bash
ddev drush cim -y          # import committed/incoming config first, so the DB matches the repo
ddev drush cex -y          # export your changes to ../config/sync
git status config/sync     # isolate your change; git restore unrelated drift
ddev drush cim -y          # round-trip to prove it imports cleanly
```

Config must land in the committed `../config/sync`, not the gitignored
`sites/default/files/sync`. Verify the target once after setup:

```bash
ddev drush ev "echo \Drupal\Core\Site\Settings::get('config_sync_directory');"
# must print ../config/sync  (set in the committed web/sites/default/settings.php)
```

### 5. Commit

Commit with the **`commit`** skill (logical chunks, brief *why*, no trailer,
commit only when asked). Commit captured config **with** the code, and
`composer.json` + `composer.lock` together (add a `vcs`/`package` repo entry for
sources not on Packagist). Never force-push or `--no-verify`;
`git push` is blocked by a local hook — hand pushes back to the user.

## Decision checklist

1. Logic in a small, named, testable unit (hooks/preprocess stay thin)?
2. Presentational layer built as an SDC where it makes sense?
3. Config captured to `../config/sync` and round-tripped?
4. Accessible (WCAG AA) — alt text, semantics, contrast, keyboard?
5. Matches Drupal best practices and the surrounding code?
