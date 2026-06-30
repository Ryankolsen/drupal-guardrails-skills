---
name: compose-canvas-page
description: Compose a Drupal Canvas page from a live Views block — expose a custom-component view mode as a placeable Views block, surface it in the Canvas Library, place it on a Canvas page, capture the config, and document the page so it is reproducible. Use when the user wants to put live/dynamic content (a View, a listing, a grid of cards) on a Canvas / Experience Builder page, make a Views block appear in the Canvas component Library, place a block or component on a Canvas page, or document a Canvas demo page.
---

# Compose a Canvas page from a live Views block

The promise: an editor drops a component fed by **live content** onto a page in
Canvas. Deliver it by rendering entities in a **view mode** (wired to your
component) inside a **Views block display**, letting Canvas surface that block as a
placeable **Block component**, and placing it on a **Canvas page**.

## The config-vs-content boundary (read this first)

This procedure crosses Drupal's config/content line, and the split decides what
you commit vs what you document:

- **Configuration (commit it):** the View + its block display, and the Canvas
  **Block component** registration (`canvas.component.block.*`). Capture to
  `config/sync` and round-trip with `ddev drush cim -y`.
- **Content (do NOT seed it):** the Canvas **page** is a `canvas_page` *content*
  entity holding a component tree — it is not config and is not fixture-seeded.
  Instead **document the build steps** in `docs/` so the page is reproducible.

## Step 1 — Expose the view mode as a Views block display

The block must render entities in the **view mode your component is wired to** (in
this repo, a custom SDC is attached via a `node--<bundle>--<viewmode>.html.twig`
template, so the view mode *is* the component). Add a **`block` display** to the
View whose row is that view mode (`row.type: 'entity:node'`,
`options.view_mode: <viewmode>`), capped to a small `items_per_page`. Reuse an
existing View — don't build a new one for the block.

→ Use the **`build-a-view`** / **`editing-views`** skill for the display YAML
(descriptive display id, `defaults: { pager: false }` so the limit actually
overrides). Cover the data source with a kernel test there. Then `ddev drush cex -y`.

## Step 2 — Make the block eligible + surface it in the Canvas Library

On `ddev drush cr`, Canvas auto-discovers every block plugin (your View's block is
`views_block:<view_id>-<display_id>`) and registers a Block component config
entity `canvas.component.block.<id>`. Two things gate whether it appears:

1. **Eligibility.** The block's settings config schema must be `FullyValidatable`
   and the block must have **no required context**. Stock Views blocks qualify.
2. **Auto-enable.** Core-provided blocks (Views counts as core) register
   **disabled** — *except* a Views block whose View `tag` does **not** contain
   `default`. So **tag your custom View with anything but `default`** (e.g. a
   project tag) and its block component enables itself on cache rebuild. No manual
   `config:set status true` needed (this differs from SDCs — see `add-canvas-sdc`).

Confirm it registered and is enabled, then capture it:

```bash
ddev drush cr
ddev drush config:get canvas.component.block.<id> status   # expect: true
ddev drush cex -y && git status config/sync
```

→ Exact lookup commands, the discovery rule, and troubleshooting a block that
won't appear: [REFERENCE.md](REFERENCE.md#step-2-details).

## Step 3 — Build the Canvas page (content — document, don't seed)

A Canvas page is the `canvas_page` content entity. Build it **in the UI** and
record every step:

1. **Add page:** `/admin/content/pages/add` (collection: `/admin/content/pages`).
2. Give it a **title** and set its **path** (the `path` field is the stable URL —
   record it; the talk navigates straight to it).
3. **Open the Canvas editor** (`/canvas/editor/canvas_page/<id>`), open the
   **Library**, find your block component (often under "Other"), and **drag it
   into the layout**. It renders live rows immediately.
4. **Publish**, then view the canonical page at `/page/<id>` (or your path alias).

→ Field-by-field walkthrough + what each route does:
[REFERENCE.md](REFERENCE.md#step-3-details).

## Step 4 — Capture the config the work produced

```bash
ddev drush cex -y
git status config/sync
```

Expect `views.view.<id>.yml` (the block display) and
`canvas.component.block.<id>.yml`. Placing/branding in the editor can also touch
`canvas.asset_library.global.yml` / `canvas.brand_kit.global.yml` — commit those
too. **Isolate the change**: `git restore` unrelated cosmetic drift. Prove it
imports: `ddev drush cim -y`.

## Step 5 — Document the page so it's reproducible

Because the page is content, the docs *are* the reproducibility mechanism. Write
`docs/<page>.md` recording: the stable **path**, the **block component** placed,
and the **exact build steps** from Step 3 — precise enough to rebuild the page on
a clean `ddev drush cim` of the committed config. → doc template:
[REFERENCE.md](REFERENCE.md#step-5-doc-template).

## Verify

`ddev drush cr`, navigate to the documented path, confirm the listing renders
**live** rows (publish/unpublish a source entity to prove it). `ddev drush cim -y`
round-trips with no diff. Suite green: `ddev exec phpunit -c phpunit.xml` — the
data source is covered by the Step-1 kernel test; the page has no automated test
(it's content).

## Gotchas

- **Don't export the page as config.** `canvas_page` is content; the committed
  artifacts are the View, the block component, and the doc.
- **Block missing from the Library?** Almost always the View is tagged `default`
  (→ registered disabled) or the block failed eligibility — check status and the
  incompatibility reasons ([REFERENCE.md](REFERENCE.md#step-2-details)).
- **One view mode = one source of truth.** Reuse the view mode your component is
  already wired to; don't add an SDC/view mode/preprocess just to place a block.
- **`status: true` is active config** — survives `cim` only if the component
  entity is committed (Step 4), else a later import re-disables it.
- **Set the page `path` deliberately and record it** — the canonical `/page/<id>`
  is not memorable for a live demo.
