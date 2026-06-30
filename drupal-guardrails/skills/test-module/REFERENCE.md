# test-module — reference

## One-time setup

### Dev dependency

`drupal/core-dev` brings PHPUnit and Drupal's test base classes. Pin it to the
**same minor as core** so the lock resolves:

```
ddev composer require --dev drupal/core-dev:^11.3 -W
```

`-W` (`--with-all-dependencies`) is usually required — core-dev pins
`phpunit/phpunit` and its `sebastian/*` deps, which conflict with whatever is
already locked unless you let them move. Commit `composer.json` + `composer.lock`.

### Root `phpunit.xml`

Place it at the **repo root** (not in `web/`). Drupal's bootstrap resolves the
app root to `web/` via `dirname(__DIR__, 2)` of `web/core/tests/bootstrap.php`,
so the bootstrap path is `web/core/tests/bootstrap.php` regardless of where you
run from. Point the test suites at `web/modules/custom/*` and `web/themes/custom/*`.

Key settings:
- `bootstrap="web/core/tests/bootstrap.php"`
- `SIMPLETEST_DB` = `sqlite://localhost//absolute/path.sqlite` (double slash =
  absolute) so kernel tests need no MySQL.
- `SIMPLETEST_BASE_URL` empty (only functional/BrowserTestBase tests need it).
- `xsi:noNamespaceSchemaLocation` must match the installed PHPUnit major
  (`.../11.5/phpunit.xsd` for PHPUnit 11).
- **Comments cannot contain `--`** — a literal `--testsuite` in an XML comment
  breaks the file. Write it as `(testsuite name)`.

Add `/.phpunit.cache/` to `.gitignore`.

## Rebuild a content model from committed config (don't re-declare it)

If the bundle/fields live in `/config/sync` (site config, not the module's
`config/install`), recreate them from the **real committed YAML** instead of
hand-writing field definitions that silently drift. Read each file, strip
`uuid`/`_core`, and `create()` the config entity. Order: field **storages**
before **instances**; a media source field before the media bundle that
references it.

```php
protected function readSyncConfig(string $name): array {
  $data = \Symfony\Component\Yaml\Yaml::parseFile(\Drupal::root() . '/../config/sync/' . $name . '.yml');
  unset($data['uuid'], $data['_core']);
  return $data;
}
// FieldStorageConfig::create($this->readSyncConfig('field.storage.node.field_x'))->save();
// then FieldConfig::create(...), NodeType::create(...), Vocabulary::create(...), MediaType::create(...).
```

Put this in a reusable trait (`tests/src/Traits/`) so every test in the module installs the same model.

## Testing a service / importer

The stable boundary is the **service interface**, not the Drush command or hook
that calls it. Pull it from the container and assert its contract:

```php
$importer = $this->container->get('mymodule.importer');
$this->assertSame(['created' => 2, 'updated' => 0, 'skipped' => 0], $importer->import($rows));
// Re-run to prove idempotency: created => 0, and entity counts unchanged.
```

## Testing a View without rendering

Load the committed view config, **execute** it, and inspect `$view->result` —
this tests the query (filters, sorts, access) at the data layer with no theme or
template:

```php
\Drupal\views\Entity\View::create($this->readSyncConfig('views.view.my_view'))->save();
$view = \Drupal\views\Views::getView('my_view');
$view->setDisplay('page_1');
$view->execute();
$ids = array_map(fn($row) => (int) $row->_entity->id(), $view->result);
```

Rendering rows (`$view->render()`) pulls in the theme + SDC and is much heavier;
prefer executing unless you specifically test markup (use a functional test then).
