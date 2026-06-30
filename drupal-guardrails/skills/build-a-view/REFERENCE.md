# build-a-view — reference

On-demand detail for [SKILL.md](SKILL.md). Generic patterns live here; for
concrete, current implementations this points at the live files in the repo
(those can't go stale the way a pasted snapshot would).

## Full `views.view.<id>.yml` anatomy

```yaml
uuid: <uuid>            # fresh random UUID; the kernel-test trait strips it
langcode: en
status: true
dependencies:
  config: [core.entity_view_mode.node.card, node.type.<bundle>]
  module: [node, user]
id: <id>
label: '<Human label>'
module: views
base_table: node_field_data
base_field: nid
display:
  default:
    display_plugin: default
    display_options:
      pager: { type: full, options: { items_per_page: 12, id: 0 } }
      access: { type: perm, options: { perm: 'access content' } }
      cache: { type: tag, options: {} }
      sorts: { ... }      # see below
      arguments: { ... }  # contextual filters — see the reverse-ref pattern
      filters: { ... }    # status + type, keyed by entity_field
      style: { type: grid, options: { columns: 3 } }
      row: { type: 'entity:node', options: { view_mode: card } }
    cache_metadata: { max-age: -1, contexts: [...], tags: {} }
  <descriptive>_page:                        # NOT page_1 — see "Name every display"
    display_plugin: page
    display_title: '<Descriptive> page'
    display_options: { path: <path> }       # a page has a path
  <descriptive>_block:                       # NOT block_1
    display_plugin: block
    display_title: '<Descriptive> block'
    display_options: { block_description: '<Admin block name>' }
```

Filters and sorts that wrap a real entity field carry `entity_type: node` and
`entity_field: <field_name>`, and are keyed by the column (e.g.
`field_rating_value`, `status`, `type`). Copy the shape from an existing committed
View rather than inventing keys — canonical examples in
`config/sync/views.view.top_rated.yml` (page + sort) and
`views.view.games_by_designer.yml` (argument).

## Name every display: example + chase the references

Rename **both** the generic machine name (`page_1`/`block_1`) and Display name
(`Page`/`Block`), scoped to the View (display ids are unique within their View):

```yaml
display:
  default:                     # keep the default display as `default` — it is special
    id: default
    display_title: Default
  designer_page:               # was page_1 — machine name describes the display
    id: designer_page          # the inner `id:` must equal the YAML key
    display_title: 'Designer games page'   # was "Page" — human Display name
    display_plugin: page
  designer_block:              # was block_1
    id: designer_block
    display_title: 'Designer games block'  # was "Block"
    display_plugin: block
```

Repo convention: `<subject>_page` / `<subject>_block` machine name (`finder_page`,
`publisher_block`) + spoken-language Display name (`Finder page`). The View id
already carries the subject, so the display name only disambiguates the variant.

**Renaming a display is a rename, not just a relabel — chase the references:**

- The YAML **key** under `display:` and its inner `id:` must match.
- A **block placement** names the display: `plugin` /`settings.id`
  `views_block:<view_id>-<display_id>` in `block.block.*.yml` must use the new id.
- The auto-generated **route** is `view.<view_id>.<display_id>` — any
  `Url::fromRoute()` / `{{ url(...) }}` referencing it must change (the *path*
  is unaffected).
- **Kernel tests** call `$view->setDisplay('<display_id>')` — update them.

Do this when you author the View; renaming later means touching every reference.

## Placing the reverse-ref block on the right pages

A block display becomes a `views_block:<view_id>-<display_id>` plugin. Place it
with a `block.block.<theme>_<id>.yml`: region `content`, weight after the main
content, and a **bundle visibility condition** so it only appears on the intended
pages (this adds a `config: node.type.<bundle>` dependency — declare it):

```yaml
visibility:
  'entity_bundle:node':
    id: 'entity_bundle:node'
    context_mapping: { node: '@node.node_route_context:node' }
    bundles: { <bundle>: <bundle> }
```

See your committed config sync dir for live block placement examples.

## Exposed filters: detailed shapes

Set `exposed: true` + an `expose:` block with a clean `identifier` (the
query-string key, e.g. `?max_time=45`). Lock the operator (`use_operator: false`,
fixed `operator:`) when the visitor supplies only a value, not a comparison.

- **Single-value numeric** (`plugin_id: numeric`, `operator: '<='`) — one input,
  e.g. "max play time". Value shape is `{ min: '', max: '', value: '' }`.
- **Range** (`plugin_id: numeric`, `operator: between`) — renders *two* inputs
  (min/max), e.g. a complexity band. Same value shape; `between` reads min+max.
- **Taxonomy facet** (`plugin_id: taxonomy_index_tid`, `table: taxonomy_index`) —
  a term dropdown. Scope it to one vocabulary with `vid: <machine_name>` +
  `limit: true`, `type: select`. It filters via the `taxonomy_index` table,
  which Drupal maintains on node save (so the node's term references are indexed
  automatically — no relationship needed). Two such filters (e.g. Mechanic and
  Category) coexist; each joins `taxonomy_index` on its own alias and AND-narrows.

Live example: `config/sync/views.view.game_finder.yml`.

## Custom range filter: one value against two columns

When one input must test two columns (e.g. "supports N players" means
`field_min ≤ N ≤ field_max`), no stock filter fits — two numeric filters would
expose two inputs and can't relate them. The technique:

1. Write a `FilterPluginBase` plugin with `public $no_operator = TRUE` (single
   value, no operator UI) and a `valueForm()` that renders one `#type: number`.
2. In `query()`, **guard an empty value before touching the query** — Views wraps
   a non-multiple exposed value in a 1-element array, and an empty/`0`/`''` value
   must mean "no constraint" or the finder matches nothing. Then
   `$this->query->ensureTable('node__<field>', $this->relationship)` for each
   field (their views data defines the join back to `node_field_data`) and
   `addWhere()` both bounds.
3. Register it via `hook_views_data()` so config can name it
   (`['filter' => ['id' => '<plugin_id>']]` under `node_field_data`), then the
   view references it as `{ table: node_field_data, field: <data_key>,
   plugin_id: <plugin_id> }` and declares `dependencies.module: [<module>]`.

See your custom module for a live `FilterPluginBase` implementation and its `hook_views_data()` registration.

## Kernel tests

Execute the View at the data layer — no browser, no DB server:

1. In `setUp()`, install the **committed** View from sync so the test exercises
   exactly what ships: `View::create($this->readSyncConfig('views.view.<id>'))->save();`
   (the content-model trait is in the `test-module` skill).
2. Load with `\Drupal\views\Views::getView('<id>')`, `setDisplay('<display_id>')`
   (the descriptive id), then drive it: `setArguments([$id])` for a contextual
   filter, or `setExposedInput(['<identifier>' => <value>])` for an exposed one.
3. `execute()` and assert over `$view->result` — entity ids/labels via
   `$row->_entity`. Use `assertSame` when the sort fixes order,
   `assertEqualsCanonicalizing` when order is incidental.
4. Also assert the negatives: unpublished rows excluded, wrong-bundle arguments
   rejected (argument validation), and the unfiltered `setExposedInput([])`
   baseline returns the full set (a custom filter that fails to guard empty
   makes this come back empty — the tell).

**`taxonomy_index_tid` setup:** `installEntitySchema('taxonomy_term')` creates the
`taxonomy_index` table (it lives in `TermStorageSchema`), and
`installConfig(['taxonomy'])` enables the on-save indexing — there is no
`installSchema('taxonomy', ['taxonomy_index'])` schema hook.

See your custom module's `tests/src/Kernel/` for live examples of argument, exposed filter, and custom filter View tests.
