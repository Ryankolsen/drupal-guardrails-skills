---
name: editing-views
description: Hand-edit an existing Drupal View's YAML to add/change filters, fields, sorts, arguments, or displays, and normalize the result to match what Drupal would export. Use when modifying `config/**/views.view.*.yml` directly.
---

# Editing View YAML Directly

Views YAML has handler-specific keys that aren't inferrable from neighboring entries. A hand-authored filter often works but drifts from the canonical export shape — the drift surfaces the next time someone opens the View in the UI and re-exports. Keep the edit close to canonical from the start, and verify it.

## Workflow

1. **Find a donor**: grep `config/` for an existing filter/field/sort on the same field, or the same handler type. Its `plugin_id` is the handler; its shape is the template.
   - **If no donor exists, stop hand-editing.** Tell the user: "I can't find a canonical example of this handler in the codebase. Safer to make this change in the Drupal UI so Drupal picks the right handler and we export a known-good shape." Then walk them through it — see the UI walkthrough in [REFERENCE.md](REFERENCE.md).
2. **Copy the donor's full shape** into the target view — every key, including ones that look redundant (`expose.reduce`, `reduce_duplicates`, full `group_info`, etc.). See the shape cheat sheet in [REFERENCE.md](REFERENCE.md).
3. **Apply the edit.**
4. **Normalize**: import + re-export so Drupal rewrites the YAML canonically.
   ```bash
   ddev drush cim -y && ddev drush cex -y
   ```
   Review `git diff` — any churn is Drupal normalizing your edit. Commit the normalized version, not the hand-authored one. If `cim` errors, read the error and fix the YAML; do not bypass with `--partial`.
5. **Verify in UI**: load `/admin/structure/views/view/{id}` and confirm the filter appears as intended. If it doesn't, the handler was wrong — revert and fall back to the UI walkthrough.

## Handler resolution

Views picks the handler from the **indexed field's type** (Search API) or **column schema** (SQL) — *not* from how the field looks. The classic trap: a content-type/bundle field (`node_bundle`) uses the **Options** handler (`search_api_options`), not String. Full mapping table and per-handler required keys: [REFERENCE.md](REFERENCE.md). Worked example: [EXAMPLES.md](EXAMPLES.md).

**To confirm the handler before editing**, find any existing filter on the same field in any view — that tells you what Drupal assigned:
```bash
# e.g., to see how node_bundle has been filtered elsewhere
grep -rn "field: node_bundle" config/ | grep -i views
```

## Related skills

- `views-development` — creating new views, programmatic execution, hooks
- `commit-message` — commit conventions for config changes
