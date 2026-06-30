---
name: seed-content-from-fixture
description: Seed Drupal content deterministically from a committed fixture via an idempotent importer service, and (optionally) generate that fixture once from a remote API with a separate dev-time tool. Use when the user wants to seed/import demo or sample content, populate entities from a JSON/CSV fixture, write a Drush seed command, make an importer idempotent (no duplicates on re-run), resolve-or-create taxonomy terms or referenced nodes, or fetch data from an external API into a committed fixture.
---

# Seed content from a committed fixture

The goal is content that can be **rebuilt and reviewed from version control**:
a committed fixture is the source of truth, an **idempotent** importer turns it
into entities, and a thin Drush command wires the two together. Crucially, any
**fetch from a live API is a separate dev-time tool** that *produces* the
fixture — it is never on the runtime seed path, so seeding (e.g. on stage, in
CI, on a fresh checkout) never depends on a flaky network call.

```
[ dev-time, once ]          [ committed ]        [ runtime, repeatable ]
  <mod>:fetch ──writes──▶  fixtures/content.json ──read by──▶ <mod>:seed
  (hits the API)           (the source of truth)              (calls importer)
```

## The three pieces

### 1. The fixture (the source of truth)

A committed file (JSON is easiest to diff/review) holding plain data rows, one
per entity, using **stable natural keys** for anything that must dedupe — a
remote id, a slug, a name. Keep it presentational-data-only; no Drupal ids.
Carrying a key the content model doesn't have a field for yet is fine if the
importer ignores unknown keys — the fixture can lead the model.

### 2. The importer service (where all the logic lives)

A service with a **small, stable interface** — `import(array $rows): array`
returning counts — so the logic is unit/kernel-testable and the Drush command
stays a wrapper. Idempotency is the headline requirement: **resolve-or-create**
every entity by its natural key, never blind-create.

```php
final class GameImporter implements GameImporterInterface {

  public function import(array $rows): array {
    $counts = ['created' => 0, 'updated' => 0, 'skipped' => 0];
    foreach ($rows as $row) {
      // Guard required keys — skip, do not crash, on a bad row.
      if (empty($row['bgg_id']) || empty($row['name'])) {
        $counts['skipped']++;
        continue;
      }
      $node = $this->resolveNode((int) $row['bgg_id']); // load-or-new by key
      $is_new = $node->isNew();
      $node->set('title', $row['name']);
      // … set scalar fields …
      // Many-to-many: resolve-or-create each term, collect ids.
      $node->set('field_mechanics', array_map(
        fn(string $name) => $this->resolveTerm('mechanics', $name)->id(),
        $row['mechanics'] ?? [],
      ));
      $node->save();
      $counts[$is_new ? 'created' : 'updated']++;
    }
    return $counts;
  }
}
```

**Resolve-or-create** is the reusable core — one per referenced thing:

```php
// A node referenced by title (Designer, Publisher): dedup on (bundle, title).
private function resolveRelatedNode(string $bundle, string $title): NodeInterface {
  $existing = $this->nodeStorage->loadByProperties(['type' => $bundle, 'title' => $title]);
  return $existing ? reset($existing)
    : $this->nodeStorage->create(['type' => $bundle, 'title' => $title, 'status' => 1]);
}

// A taxonomy term: dedup on (vid, name) so a shared term is created once.
private function resolveTerm(string $vid, string $name): TermInterface {
  $existing = $this->termStorage->loadByProperties(['vid' => $vid, 'name' => $name]);
  if ($existing) { return reset($existing); }
  $term = $this->termStorage->create(['vid' => $vid, 'name' => $name]);
  $term->save();
  return $term;
}
```

Dedup rules that keep re-runs clean:
- **Nodes** carrying the fixture's natural key: query that field, update in place.
- **Referenced nodes** (designer/publisher): dedup on `(bundle, title)` so a
  maker shared by many rows is created once and reverse-reference lists stay
  correct.
- **Taxonomy terms**: dedup on `(vid, name)`, per vocabulary.
- **Files/media** from fixture images: dedup the managed File on destination
  URI and the Media on the File it references — re-running re-copies nothing.

### 3. The Drush command (a thin wrapper)

It only reads the fixture and delegates — **no import logic** lives here, so the
service stays the test boundary.

```php
#[CLI\Command(name: '<module>:seed', aliases: ['<mod>:seed'])]
public function seed(): int {
  $rows = json_decode((string) file_get_contents(self::FIXTURE), TRUE);
  if (!is_array($rows)) { /* error + EXIT_FAILURE */ }
  $counts = $this->importer->import($rows);
  $this->logger()->success(dt('@created created, @updated updated, @skipped skipped.', [...]));
  return self::EXIT_SUCCESS;
}
```

## The fetch tool (dev-time only, off the runtime path)

When the fixture is generated from a remote API, keep that **strictly separate**
from seeding: a second Drush command (`<mod>:fetch`) calls the API and **writes the
fixture file**. Seeding never imports the network.

Design it so the parsing is testable without a network:
- Inject the HTTP client (`@http_client`); keep a **pure transform** method
  (`parse(string $body): array`) separate from the I/O, so it can be unit-tested
  against a captured response. Map the API shape to the *exact* fixture shape the
  importer consumes — including any numeric formatting (e.g. 2-decimal strings).
- Handle the API's realities: batch ids per request, honour a "queued"/202
  retry-with-backoff loop, set `http_errors => FALSE` and log non-200s rather
  than throwing. Extract the sleep into a `protected` hook so tests override it.
- A curated id/key list can live as a command constant (default set), over/
  ridable with an `--ids=`/`--out=` option. **Keep that list and the committed
  fixture in sync** if you hand-curate either.
- Write with `JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE`
  so the committed fixture diffs cleanly.

```yaml
# *.services.yml — register both, and alias the interfaces for autowiring.
services:
  <module>.fetcher:
    class: Drupal\<module>\ExternalApiFetcher
    arguments: ['@http_client', '@logger.factory']
  Drupal\<module>\ExternalApiFetcherInterface: '@<module>.fetcher'
```

## Verify

A fast **kernel test** is the guard (see `test-module`). Assert the
contract and idempotency directly against the service:

```php
$first  = $importer->import($rows);
$second = $importer->import($rows);          // re-run
$this->assertSame(0, $second['created']);    // nothing re-created
$this->assertSame(count($rows), $second['updated']);
$this->assertSame($designersAfterFirst, $this->countNodes('designer')); // no dup makers
$this->assertSame($mechanicsAfterFirst, $this->countTerms('mechanics')); // no dup terms
```

Also import the **actual committed fixture** in a test — load the file via
`extension.list.module`, run `import()`, assert every row becomes one node and a
re-run creates no duplicates. This catches a malformed row or a duplicate key
before it reaches the live seed. Test the fetch tool's `parse()` as a **pure
unit test** against a captured API body (no network); mock the HTTP client to
cover the request/retry path.

## Checklist

- [ ] Fixture committed; rows keyed by a stable natural key.
- [ ] Importer is a service behind a small interface; `import()` returns counts.
- [ ] Every entity is resolve-or-created (nodes, referenced nodes, terms, files/
      media) — re-running creates **zero** duplicates.
- [ ] Required-key guard skips bad rows instead of crashing.
- [ ] Drush seed command is a thin wrapper (no logic).
- [ ] Any API fetch is a **separate** dev-time command that writes the fixture;
      its parse step is pure and unit-tested; it is never called at seed time.
- [ ] Kernel test asserts the created/updated/skipped contract and idempotency,
      including a pass over the real committed fixture.
