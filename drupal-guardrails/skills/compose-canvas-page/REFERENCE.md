# compose-canvas-page — reference

On-demand detail for the SKILL. Read the section you need.

## Step 2 details

### How Canvas surfaces a Views block

Block plugins become Canvas **Block components** via
`\Drupal\canvas\Plugin\Canvas\ComponentSource\BlockComponentDiscovery`, which runs
on cache rebuild. A View's block display is exposed as the block plugin
`views_block:<view_id>-<display_id>` (e.g. `views_block:top_rated-top_rated_block`)
and registered as the config entity `canvas.component.block.<id>`. The component's
`source` is `block` and `source_local_id` is the block plugin id.

### Eligibility (`BlockComponent::checkRequirements()`)

A block is eligible for Canvas only if:

- its settings config schema is **`FullyValidatable`** (`type: block.settings.<plugin_id>`
  with the `FullyValidatable` constraint), and
- it has **no required context** (contexts aren't supported yet).

Stock Views blocks satisfy both. A custom block plugin that declares a required
context, or whose settings schema isn't fully validatable, will be rejected.

### Auto-enable rule (`computeInitialComponentStatus()`)

Initial `status` for a freshly discovered block component:

- Blocks provided by **non-core** modules → enabled (`status: true`).
- Blocks provided by **core** (and core-package modules, which includes the
  `views` provider) → **disabled** (`status: false`)…
- …**except** a Views block whose backing View `tag` does **not** include the
  literal `default`. Such a View is treated as site-builder content and its block
  component is **enabled**.

Practical consequence: give your custom View a non-`default` `tag` (any project
tag works) and its block component appears in the Library automatically after
`ddev drush cr`. A View tagged `default` registers disabled and you'd have to flip
it manually — avoid that tag for Views you intend to place.

### Confirm / debug

```bash
# Did the component register, and is it enabled?
ddev drush config:get canvas.component.block.<id>            # whole entity
ddev drush config:get canvas.component.block.<id> status      # expect: true

# List all block components Canvas knows about:
ddev drush config:status | grep canvas.component.block

# If it never appears or status keeps reverting, ask Canvas why it's incompatible:
ddev drush php:eval '$r = \Drupal::service("Drupal\canvas\ComponentIncompatibilityReasonRepository")->getReasons(); echo json_encode($r["block"] ?? "none", JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);'
```

To find the exact `<id>` if you're unsure, `ddev drush cex -y` and look for the
new `canvas.component.block.*.yml` file in `git status config/sync`.

### Anatomy of a captured Block component (system block shown)

```yaml
uuid: …
status: true                 # ← enabled = appears in the Library
dependencies:
  module: [system]
active_version: <hash>
versioned_properties:
  active:
    settings:
      default_settings:
        id: <block_plugin_id>
        label: '<Admin label>'
        label_display: '0'
        provider: <module>
    fallback_metadata:
      slot_definitions: null
label: '<Human label>'
id: block.<block_plugin_id>
provider: <module>
source: block
source_local_id: <block_plugin_id>
```

For a Views block, `source_local_id` is `views_block:<view_id>-<display_id>` and
the module dependency is `views` plus the View config.

## Step 3 details

`canvas_page` content entity (`\Drupal\canvas\Entity\Page`) routes:

| Action | Route / path |
|---|---|
| List pages | `/admin/content/pages` (collection) |
| **Add a page** | `/admin/content/pages/add` (action link "Add Page") |
| **Edit in Canvas** | `/canvas/editor/canvas_page/{canvas_page}` |
| View (canonical) | `/page/{canvas_page}` |
| Delete | `/page/{canvas_page}/delete` |
| Revisions | `/page/{canvas_page}/revisions` |

Permissions: `create canvas_page`, `edit canvas_page`, `delete canvas_page`.

Build steps to document:

1. **Add Page** at `/admin/content/pages/add`. Set **Title**.
2. Set the **Path** (`path` base field) — this is the stable, memorable URL.
   Record it verbatim in the doc; don't rely on `/page/<id>`.
3. **Add to Canvas** opens the editor. The layout is the page's **component tree**
   (the `components` field). Open the **Library** panel.
4. Find the Block component (Views blocks usually sort under **"Other"**; search
   by the component label). **Drag it into the canvas**; it renders live rows in
   the preview.
5. Adjust the block's exposed **settings** in the right-hand form if the block
   plugin offers any (label display, etc.).
6. **Publish** (the entity has a published/unpublished status).
7. Verify at the **canonical** URL and at your **path**.

The page stores *instructions*, not data: the block component pulls its rows live
from the View at render time, so the page reflects the current catalog.

## Step 5 doc template

Create `docs/<page-slug>.md`:

```markdown
# <Page name> (Canvas demo page)

**Stable path:** `/<your-path>`  ·  **Entity:** `canvas_page` (content, not config)

This page is *content*, so it is not exported to `config/sync`. Rebuild it from
these steps after a clean `ddev drush cim -y` of the committed config (the View
and its Canvas Block component are config and import automatically).

## Prerequisites (config — imported by `cim`)
- View `views.view.<id>` with the `<display_id>` block display.
- Canvas Block component `canvas.component.block.<id>` (status: true).

## Rebuild steps
1. `/admin/content/pages/add` → Title `<title>`, Path `/<your-path>`.
2. Add to Canvas → open Library → drag **<component label>** into the layout.
3. (settings, if any)
4. Publish. Confirm live rows at `/<your-path>`.
```

Keep the doc precise enough that someone who has never seen the page can recreate
it. The doc replaces the seeder that config-vs-content rules would otherwise
require.

## Why no automated test for the page

The **data source** (the View's block display) is covered by a kernel test (see
`build-a-view` / `test-module`): load the View, `setDisplay('<display_id>')`,
`execute()`, assert the returned entity ids, the view mode, and the row cap. The
**page** itself is content authored in a browser — it has no unit test; its
verification is the `cim` round-trip of the config plus manual navigation, and the
doc is its reproducibility guarantee.
