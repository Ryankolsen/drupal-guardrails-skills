---
name: adding-fields
description: Add (or remove) a field on an existing Drupal bundle via exported config YAML, then normalize and capture it. Use when wiring a single field onto a content type or other fieldable bundle that already exists — not when scaffolding a whole new bundle (use create-content-type for that).
---

# Adding a Field to an Existing Bundle

One field onto a bundle that already exists (for a whole new type, use
`create-content-type`). Prefer **copying a sibling field's YAML** and retargeting
it over hand-authoring keys. Config lives in `/config/sync` (single directory —
no `config_split` here); custom code in `web/modules/custom`.

## Checklist

For `field_foo` on bundle `<bundle>` (entity type usually `node`):

- [ ] `field.storage.node.field_foo.yml` — **only if new storage**; reuse existing storage when the field already exists on another bundle
- [ ] `field.field.node.<bundle>.field_foo.yml` — the instance (label, required, handler settings)
- [ ] `core.entity_form_display.node.<bundle>.default.yml` — widget + dependency
- [ ] **Every** `core.entity_view_display.node.<bundle>.*.yml` — add the dependency and either render the field under `content:` or list it under `hidden:`. Miss one and the field silently won't appear in that view mode.
- [ ] `grep -rn 'field_foo' web/modules/custom web/themes/custom` — adding an instance can activate dormant form alters / preprocess logic

Find all displays for a bundle:

```bash
ls config/sync/core.entity_{form,view}_display.node.<bundle>.*.yml
```

## Pattern — copy, don't compose

1. Find a sibling field of the same type/cardinality on the same (or a peer) bundle.
2. Copy its storage (if needed), instance, and every display entry.
3. Retarget `id:`, `bundle:`, `field_name:`, `label:`.
4. Mirror the render/hide decision in each view mode.

## Surface the field through a component

Presentational output in this repo is built with **Single Directory Components**
(see `add-canvas-sdc`). When the new field should show on a card or detail view:
add the field to the relevant `core.entity_view_display.*` (or `hidden:` it if a
preprocess maps it), then map it to the component's prop in the bundle's
`*_preprocess_*()` hook — never read the field value in Twig.

## Capture & normalize

```bash
ddev drush cim -y
ddev drush cex -y
ddev drush cr
```

**Why `cex` after `cim` is mandatory.** Hand-authored YAML differs from the
exporter's output (missing `uuid:`, key order, absent optional keys). `cim` loads
it; `cex` writes Drupal's normalized version back — auto-assigned UUID onto
`field.field.*.yml`, fixed key order, added keys. Review the `git diff`: expect at
minimum a `uuid:` added to each new `field.field.*.yml`, and commit that. If `cex`
shows deletions or unrelated changes, stop and investigate — the only expected diff
is normalization of the files you just added.

## Gotchas

- **Omit `uuid:`** in new files; never copy a sibling's. A stale UUID in
  `field.field.*.yml` causes infinite drift — every `cim` re-applies the file
  because the DB UUID won't match.
- **Storage is shared across bundles.** Don't change cardinality / `target_type`
  on existing storage for one bundle's sake — create a new field instead.
- **Unlimited cardinality is `-1`**, not `0`.
- **Entity-reference** needs `handler` + `handler_settings.target_bundles` on the
  instance, or autocomplete returns every entity.

QA: the edit form shows the widget, save persists, every view mode renders or
hides the field as intended, and any hook keyed on the field name behaves.
