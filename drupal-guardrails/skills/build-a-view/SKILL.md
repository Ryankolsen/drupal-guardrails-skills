---
name: build-a-view
description: Build a Drupal View as version-controlled config — a listing page, a block, or a related-items list via a reverse entity-reference contextual filter — then capture it to exported config and verify it with a fast kernel test. Use when the user wants to add/create a View, a listing page, a "related content" or "items by X" list (e.g. all articles by an author, all products in a category), a contextual filter / argument, a Views block, or a reverse-relationship listing.
---

# Build a View the config-managed way

A View is **configuration** (`views.view.<id>.yml`): base table, displays,
filters, sorts, arguments, style, and row plugin all live in exported config.
Clicking it together in the UI and never exporting leaves it in one database
only. This skill produces a View **and captures it to `config/sync`** in one pass.

## Decide the View first

- **Base table**: usually `node_field_data` (content), `base_field: nid`.
- **Filters / sorts**: what it lists (`status = 1`, `type = <bundle>`) and order
  (a rating field DESC).
- **Displays**: a `page` (has a `path`), a `block` (placeable), or both — each
  inherits `default` and overrides only what differs.
- **Row + style**: rendered entity in a view mode (`row.type: 'entity:node'`,
  `options.view_mode: card`) inside a `grid`/`unformatted` style — or Views fields.
- **Contextual filter?** A list that depends on the URL or current page (author,
  term, current node) is an **argument**, not an exposed filter.

## Author the YAML

`views.view.<id>.yml`. Filters/sorts wrapping a real entity field carry
`entity_type: node` + `entity_field: <field_name>` and are keyed by the column
(`field_rating_value`, `status`, `type`). Copy the shape from an existing
committed View rather than inventing keys.
→ Full annotated skeleton: [REFERENCE.md](REFERENCE.md#full-viewsviewidyml-anatomy).

**Name every display descriptively, when you author it.** Drupal hands new
displays generic identities (`page_1`/`block_1`, names `Page`/`Block`); rename
**both** the machine name and Display name, scoped to the View — this repo uses
`<subject>_page` / `<subject>_block` (`finder_page`, `publisher_block`) with a
spoken-language Display name. Keep `default` as `default`. Renaming later means
chasing the block placement, the `view.<view_id>.<display_id>` route, and test
`setDisplay()` calls. → [REFERENCE.md](REFERENCE.md#name-every-display-example--chase-the-references).

## Reverse entity-reference pattern (the useful part)

To list "all A that reference entity B" (games by a designer, articles by an
author) you do **not** need a Views relationship — add a **contextual filter
(argument)** on the reference field's data column. For `field_designers` on nodes,
that's table `node__field_designers`, column `field_designers_target_id`:

```yaml
arguments:
  field_designers_target_id:
    id: field_designers_target_id
    table: node__field_designers
    field: field_designers_target_id
    entity_type: node
    entity_field: field_designers
    plugin_id: numeric
    default_action: 'not found'        # no arg → 404 (page); 'empty' for a block
    specify_validation: true
    validate:
      type: 'entity:node'              # arg must be a node…
      fail: 'not found'
    validate_options:
      bundles: { designer: designer }  # …of the right bundle
    break_phrase: false
```

The argument is the **id of the referenced entity**; Views joins
`node__field_designers` to the base automatically. A single-value field
(`field_publisher`) works identically via `node__field_publisher` /
`field_publisher_target_id`. Supply the argument two ways:

- **Page** — a `%` placeholder in the path: `path: designer/%/games`.
- **Block** — `default_argument_type: node` ("Content ID from URL") + a bundle
  visibility condition to read the current node id, with `default_action: empty`
  so it renders nothing off-context.
  → block placement YAML: [REFERENCE.md](REFERENCE.md#placing-the-reverse-ref-block-on-the-right-pages).

## Exposed filters & facets

An **exposed** filter renders a control so the visitor narrows the list
(`exposed: true` + an `expose:` block; `identifier` becomes the query key). Stock
shapes: single-value numeric, a `between` range (two inputs), a
`taxonomy_index_tid` term facet → [REFERENCE.md](REFERENCE.md#exposed-filters-detailed-shapes).
When one value must test two columns (`field_min_players ≤ N ≤ field_max_players`),
write a custom `FilterPluginBase` registered via `hook_views_data()` →
[REFERENCE.md](REFERENCE.md#custom-range-filter-one-value-against-two-columns).

## Capture to config (non-negotiable)

```bash
ddev drush cex -y
git status config/sync          # expect views.view.<id>.yml + any block.block.*.yml
```

**Isolate your change**: a fresh `cex` can surface unrelated cosmetic drift —
`git restore` those so the commit holds only the new View. Round-trip with
`ddev drush cim -y` to prove it imports cleanly.

## Verify with a kernel test (no browser, no DB server)

Execute the View at the data layer — load it, `setDisplay()` the descriptive id,
set the argument (`setArguments`) or exposed input (`setExposedInput`),
`execute()`, assert the result entity ids/labels. Install the committed View from
sync in `setUp()` so the test exercises exactly what ships. → full examples + the
`taxonomy_index` schema setup: [REFERENCE.md](REFERENCE.md#kernel-tests). (Content-model
trait: see `test-module`.)

## Gotchas

- **A not-submitted exposed filter must be a no-op.** Views still calls `query()`
  on a filter the visitor left blank — stock numeric/term filters self-skip an
  empty value, but a *custom* filter must guard (return early on empty/0) or it
  silently matches nothing. Tell: the unfiltered `setExposedInput([])` baseline
  also comes back empty.
- **Argument validation matters.** Without `validate.type: 'entity:node'` +
  `bundles`, any numeric id (wrong type, stale) leaks rows.
- **Cache contexts.** A View driven by a URL/route argument needs `url` (or
  `url.path`) in `cache_metadata.contexts`, not just `url.query_args`.
- **Unlimited-cardinality reference** fields have their own `node__<field>` table
  — that's the table the argument lives on.
- A `block` display has no path; a `page` display needs a unique `path`.
