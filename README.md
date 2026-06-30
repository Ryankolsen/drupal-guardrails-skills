# Drupal Guardrails Skills

A Claude Code plugin with 17 skills for Drupal 11 + DDEV development. Skills cover content modelling, Views, Single Directory Components, Canvas / Experience Builder, PHPUnit kernel tests, contrib patching, code review, and general development workflow.

## Installation

**Step 1 — Add this marketplace:**

```
/plugin marketplace add ryankolsen/drupal-guardrails-skills
```

**Step 2 — Install the plugin:**

```
/plugin install drupal-guardrails
```

All 17 skills become available immediately in any project. Claude Code auto-discovers them by description — no manual registration needed.

## Update

```
/plugin update drupal-guardrails
```

## Uninstall

```
/plugin uninstall drupal-guardrails
/plugin marketplace remove ryankolsen/drupal-guardrails-skills
```

## Prerequisites

Most skills assume:

- **Drupal 11** running under **DDEV**
- Custom modules in `web/modules/custom/`, custom theme in `web/themes/custom/<theme>/`
- Config sync wired to a committed directory (e.g. `config/sync`)
- `ddev drush`, `ddev exec composer phpcs`, `ddev exec composer phpstan`, `ddev exec phpunit` all available

The workflow skills (`build-feature`, `commit`, `to-prd`, `to-issues`, `trim-a-skill`) work in any project without a Drupal/DDEV environment.

## Skills

| Skill | Description | Scope |
|-------|-------------|-------|
| `do-work` | End-to-end unit of work: plan → implement (TDD for modules, SDC-first for UI) → validate → commit. The "which skill to reach for" decision map lives here. | Drupal |
| `build-feature` | Guides feature implementation as a tracer-bullet vertical slice — thin end-to-end first, then expand. | General |
| `create-content-type` | Scaffold a content type (or any fieldable bundle) with fields and taxonomy vocab, captured to exported config. | Drupal |
| `adding-fields` | Add or remove a field on an existing Drupal bundle via config YAML. | Drupal |
| `build-a-view` | Build a Drupal View as version-controlled config — listing page, block, related-items list via contextual filter, verified with a kernel test. | Drupal |
| `editing-views` | Hand-edit an existing View's YAML to add/change filters, fields, sorts, arguments, or displays. | Drupal |
| `add-canvas-sdc` | Scaffold an SDC that works in Drupal Canvas / Experience Builder — covers prop shapes, `examples`, slots, and the enable workflow. | Drupal |
| `compose-canvas-page` | Compose a Canvas page from a live Views block — expose a view mode as a block, surface it in the Canvas Library, place it, and capture config. | Drupal |
| `test-module` | Stand up PHPUnit for a custom module — test config, SQLite-only run setup, and fixture patterns (installEntitySchema / installConfig). | Drupal |
| `seed-content-from-fixture` | Seed Drupal content deterministically from a committed fixture via an idempotent importer service; optionally fetch the fixture from a remote API with a separate dev-time command. | Drupal |
| `drupal-code-review` | Review Drupal PHP, Twig, and config changes for bugs, side effects, and consistency. | Drupal |
| `drupal-core-update` | Update Drupal core to a new patch or security release via Composer. | Drupal |
| `create-patch` | Create a Composer patch for a contrib module or untracked file. | Drupal |
| `commit` | Commit changes following the conventions for the current repo — split logical commits, WHY-focused messages, no trailer. | General |
| `to-prd` | Turn the current conversation context into a PRD and publish it to the project issue tracker. | General |
| `to-issues` | Break a plan or PRD into independently-grabbable issues using tracer-bullet vertical slices. | General |
| `trim-a-skill` | Refactor a bloated SKILL.md to use fewer tokens — move detail into reference files, cut what the agent already knows, tighten prose. | General |

## Credits / Attribution

The `to-prd` and `to-issues` skills originated with **Matt Pocock** and are published at [github.com/mattpocock/skills](https://github.com/mattpocock/skills). They are included here with attribution and light adaptation.

All other skills were written by [Ryan Kolsen](https://github.com/ryankolsen).

## Links

- **Matt Pocock's original skills:** [github.com/mattpocock/skills](https://github.com/mattpocock/skills)

## License

[MIT](LICENSE)
