---
name: create-content-type
description: Scaffold a Drupal content type (or any fieldable bundle) with its fields and a supporting taxonomy vocabulary, then capture the result to exported config. Use when the user wants to add/create a content type, node type, entity bundle, fields, or a vocabulary, and have the model version-controlled as config. Covers field storage vs. field instance, entity-reference handler settings, view modes, and the config-capture workflow.
---

# Create a content type the config-managed way

A content type is **configuration**, not content: the bundle, every field, the
form/display arrangement, and any vocabulary it references must end up in exported
config. The trap is clicking it together in the UI and never exporting — the work
then lives only in one database. This skill produces the type + fields + vocabulary
and **captures it to `config/sync`** in one pass.

## Decide the model first

Before creating anything, write down:

- **Bundle**: machine name (`a-z0-9_`, e.g. `article`) and human label.
- **Fields**: for each, the machine name (`field_*`), field **type**,
  **cardinality** (1 or unlimited), whether it's **required**, and any
  type-specific settings (decimal precision/scale, entity-reference target).
- **Vocabularies**: any taxonomy the content references (machine name + label).
  Decide if terms are author-managed or **resolved-or-created by an importer**.

Common field types: `integer`, `decimal` (`settings.precision`/`scale`),
`string`, `text_long`, `boolean`, `datetime`, `link`, `image`,
`entity_reference` (`settings.target_type`, instance
`handler_settings.target_bundles`).

> Field storage vs. field instance: **storage** (`field.storage.*`) defines the
> field once per entity type (type + cardinality, shared across bundles);
> **instance** (`field.field.*`) attaches it to one bundle with a label,
> required flag, and handler settings. You create both.

## Build it (two routes — pick one)

### Route A — Drush / Entity API (scriptable, reproducible, CI-friendly)

Author a short PHP script (`drush php:script path/to/setup.php`) that creates, in
order: vocabulary → bundle → field storage (once) → field instance (per bundle) →
optional view mode → form/view display placement. Guard each create with an
existence check (`::load`/`::loadByName`) so it re-runs safely. Full skeleton with
the per-type `settings` values: see [EXAMPLES.md](EXAMPLES.md).

### Route B — Admin UI

Structure → Content types → Add content type, then add each field. Use this when
you want to see widget/formatter choices interactively. The fields and displays
still become config — you must export afterward (next step).

## Capture to config (non-negotiable)

Export and review the diff so only the intended entities are committed:

```bash
ddev drush cex -y
git status config/sync
```

Expect new files: `node.type.<bundle>.yml`, `field.storage.node.<field>.yml`,
`field.field.node.<bundle>.<field>.yml`, `core.entity_form_display.*`,
`core.entity_view_display.*`, `core.entity_view_mode.*`,
`taxonomy.vocabulary.<vid>.yml`, plus an updated `core.extension.yml` if you
enabled a module.

> **Isolate your change.** A fresh `cex` can surface pre-existing, cosmetic
> drift (key reordering, `1` vs `true`, an environment-only setting) in
> unrelated files. `git restore` those so the commit contains only the new
> content type and its fields. Verify the result is self-consistent with a
> round-trip: `ddev drush cim -y` should import with no errors.

## Verify

- `ddev drush field:info node <bundle>` lists every field with the right type,
  cardinality, and required flag.
- Create one entity (UI or a seed command) and confirm each field saves and
  renders.
- `ddev drush cim -y` re-imports the exported config cleanly on a synced site.

## Gotchas

- **Decimal precision/scale** live in field **storage** settings, not the
  instance.
- **Entity-reference** needs `settings.target_type` on the storage and
  `handler` + `handler_settings.target_bundles` on the instance, or the
  reference autocomplete returns everything.
- **Unlimited cardinality** is `-1`, not `0`.
- Renaming or retyping a field after data exists is destructive — decide the
  type up front.
- Removing a field instance then re-exporting also removes its storage only when
  no other bundle uses it; check the diff.
