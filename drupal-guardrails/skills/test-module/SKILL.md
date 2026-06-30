---
name: test-module
description: Stand up PHPUnit for a Drupal project and write fast kernel tests for a custom module — the test config, the SQLite-only run setup, and the fixture patterns (installEntitySchema/installSchema/installConfig, plus rebuilding a content model from committed config). Use when the user wants to add tests, set up PHPUnit/phpunit.xml, write a kernel/unit/functional test, or test a service, importer, or View in Drupal.
---

# Set up PHPUnit + kernel tests for a Drupal module

Goal: a suite that runs from the repo root with **no extra database server**
(SQLite), exercises **real custom code** (services, Views, hooks), and stays
green on a clean checkout via `ddev composer install`. Kernel tests are the
workhorse — they boot a real container + database but no webserver, so they are
fast and cover the data layer where most custom logic lives.

## Setup (once)

```
ddev composer require --dev drupal/core-dev:^11.3 -W   # -W moves phpunit/sebastian deps; usually required
```

Add a root `phpunit.xml` (repo root, **not** `web/`) and `/.phpunit.cache/` to
`.gitignore`. Full template + the bootstrap-path / SQLite `SIMPLETEST_DB` /
schema-location / `--`-in-XML-comments gotchas: [REFERENCE.md](REFERENCE.md).

Run all tests with `ddev exec phpunit -c phpunit.xml`, or one group with
`ddev exec phpunit -c phpunit.xml --group <group>`.

## Test file location & shape

Tests live at `web/modules/custom/<module>/tests/src/{Unit,Kernel,Functional}/`
with namespace `Drupal\Tests\<module>\{Unit,Kernel,Functional}`. Shared helpers
go in `tests/src/Traits/` (`Drupal\Tests\<module>\Traits`).

Use **PHP attributes, not doc-comment annotations** — PHPUnit 11 deprecates
`@group`/`@covers`/`@dataProvider` in doc-comments and Drupal's strict runner
surfaces every one:

```php
use PHPUnit\Framework\Attributes\Group;
use PHPUnit\Framework\Attributes\CoversClass;

#[Group('mymodule')]
#[CoversClass(MyService::class)]
final class MyServiceTest extends KernelTestBase { ... }
```

## Kernel test boot recipe

In `setUp()`, after `parent::setUp()`:

- `protected static $modules = [...]` — list **every** module explicitly,
  including dependencies (e.g. `system, user, field, text, filter, node,
  taxonomy, file, image, media, views`).
- `installEntitySchema('<id>')` for each **content** entity you touch
  (`user`, `node`, `taxonomy_term`, `file`, `media`). Config entities
  (node type, vocabulary, view) need no schema.
- `installSchema(...)` for plain (non-entity) tables your code hits:
  - `installSchema('node', ['node_access'])` — **required** whenever you save
    nodes or execute a node View, or you get `no such table: node_access`.
  - `installSchema('file', ['file_usage'])` — when managing files/media.
- `installConfig(['system', 'field', 'filter', 'node', ...])` for module
  default config (filter formats, field settings).

If the content model lives in `/config/sync`, rebuild it from the committed YAML
via a reusable trait rather than re-declaring fields (it silently drifts) — recipe
in [REFERENCE.md](REFERENCE.md), which also has worked test recipes for a
**service/importer** and a **View** (execute, don't render).

## Gotchas

- **Decimal fields normalise**: a stored `'7.10'` reads back as `'7.1'`. Compare
  as float (`assertEquals(7.1, (float) $value)`), not `assertSame` on the string.
- **Strict runner**: Drupal sets `failOnWarning`/`beStrictAbout*`. Unused data
  providers, risky tests, and doc-comment metadata all fail the build — fix them,
  don't suppress.
- **Setting an unknown field throws**: `$entity->set('field_x', …)` on a content
  entity errors if `field_x` isn't installed, so install every field the code
  under test writes.
