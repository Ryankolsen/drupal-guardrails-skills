# Editing Views — handler reference

## Handler resolution

Views picks the handler based on the **indexed field's type** (Search API views) or the **field's column schema** (SQL views).

| Field looks like | Actual Views handler | `plugin_id` |
|---|---|---|
| Content type / bundle (e.g., `node_bundle`) | Options (not string) | `search_api_options` |
| List (text/integer) field | Options | `views_handler_filter_in_operator` / SA equivalent |
| Taxonomy term reference | Entity reference / term | `search_api_term` or `taxonomy_index_tid` |
| Boolean | Boolean | `search_api_boolean` / `boolean` |
| Integer / decimal | Numeric | `search_api_numeric` / `numeric` |
| String (plain text) | String | `search_api_string` / `string` |
| Full-text searched | Fulltext | `search_api_fulltext` |
| Date | Date | `search_api_date` / `date` |

## Handler shape cheat sheet

Each handler has non-obvious required keys. When copying a donor, bring *all* of these:

**Options handler (`search_api_options`, `in_operator`)**
- `operator`: `in` | `not` (not `=` / `<>`)
- `value`: keyed map `{ key: key, key2: key2 }` — never a scalar or list
- `expose.reduce: false` — required even when not exposed
- Trailing `reduce_duplicates: false` — outside `expose`

**String handler (`search_api_string`, `string`)**
- `operator`: `=` | `<>` | `contains` | `starts` | `ends` | `empty` | `not empty`
- `value`: scalar string

**Boolean handler (`search_api_boolean`, `boolean`)**
- `value`: `'0'` | `'1'` (string, not bool)

**All filters regardless of handler**
- `id`, `table`, `field`, `relationship: none`, `group_type: group`, `admin_label: ''`, `plugin_id`, `group: 1`
- Full `expose` block with `remember_roles`, even when `exposed: false`
- Full `group_info` block, even when `is_grouped: false`

## UI walkthrough (fallback)

When no donor is available, or the hand-edit doesn't verify in the UI, guide the user through making the change in Drupal:

1. Open `/admin/structure/views/view/{view_id}` in the target env (local `ddev launch` usually).
2. Pick the correct **display** from the left column (e.g., `page_1`, not "Default", unless the change should apply to all displays).
3. In the appropriate section (Filter criteria / Fields / Sort criteria / Contextual filters), click **Add**, pick the field, configure it.
4. Confirm "This display" scope (not "All displays") unless the change is global.
5. **Save** the view.
6. In terminal: `ddev drush cex -y`.
7. Review the diff — should only touch the target `views.view.{id}.yml`. Commit.
