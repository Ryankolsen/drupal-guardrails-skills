---
name: create-patch
description: Create a composer patch for a contrib module or untracked file. Use when fixing bugs in contrib modules, core, or any file not tracked by git.
---

# Creating a Composer Patch

Use when fixing bugs in contrib modules or untracked files. **Never edit untracked files directly** — Composer overwrites on install.

## Patch file location and naming

All patches live in `composer/patches/`. Name:

```
{module-name}-{short-description}.patch
```

If fix maps to Drupal.org issue, include issue number:

```
{module-name}-{short-description}-{issue-number}.patch
```

Examples:
- `decision-tree-step-delete-confirm-return-type.patch`
- `antibot-getelementbyid-duplicate-ids-3568320.patch`
- `paragraphs-link-template-brackets-fix.patch`

## Patch format

Unified diff, paths **relative to module root**, `a/` and `b/` prefixes (applied with `patch -p1`).

```patch
diff --git a/src/Form/SomeForm.php b/src/Form/SomeForm.php
--- a/src/Form/SomeForm.php
+++ b/src/Form/SomeForm.php
@@ -14,7 +14,7 @@
   /**
    * {@inheritdoc}
    */
-  public function getCancelUrl() {
+  public function getCancelUrl(): Url {
     $entity = $this->entity;
```

## Workflow

### Step 1 — Verify the fix first

Edit untracked file directly, confirm fix works in browser. Acceptable because edit is temporary/throwaway — avoids writing patch for broken fix.

Once confirmed, **undo the edit** before creating patch.

### Step 2 — Generate the patch

1. Copy original to `.orig` backup:
   ```bash
   cp path/to/file.php path/to/file.php.orig
   ```

2. Apply the fix to the actual file (same change you tested in Step 1).

3. Generate the diff with paths relative to the module root:
   ```bash
   git diff --no-index \
     path/to/module/src/Form/File.php.orig \
     path/to/module/src/Form/File.php \
     | sed 's|.*/modules/contrib/module-name/||g'
   ```

   Or write the patch manually — it's often faster for small changes.

4. Restore the original file:
   ```bash
   cp path/to/file.php.orig path/to/file.php && rm path/to/file.php.orig
   ```

5. Save the patch output to `composer/patches/{name}.patch`.

## Register in composer.json

Add the patch under `extra.patches` in `composer.json`:

```json
"drupal/decision_tree": {
    "Fix DecisionTreeStepDeleteConfirm getCancelUrl return type for PHP 8": "composer/patches/decision-tree-step-delete-confirm-return-type.patch"
}
```

Use a descriptive label — it shows up in `composer install` output and helps
future developers understand why the patch exists.

## Apply and verify

```bash
ddev composer install
```

Composer will log: `Applying patch composer/patches/your-patch.patch` for the
package. Verify the fix works in the browser.

## Troubleshooting

- **Patch fails to apply**: Check that line numbers and context lines exactly
  match the installed version of the module. Run `composer show drupal/module`
  to confirm the installed version.
- **Wrong path prefix**: Paths must be relative to the module root (not the webroot).
  The `diff --git a/src/...` prefix gets `a/` stripped by `patch -p1`.
