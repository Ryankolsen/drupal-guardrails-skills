# Do Work — Reference

Detailed enumerations pulled out of SKILL.md. The headline rules live there; the
full lists and exact commands live here.

## Tracer-bullet TDD (module logic)

Order tests thinnest vertical slice → widest, one at a time:

1. **Slice 1 — thinnest end-to-end:** prove the core wiring. One assertion on the
   essential outcome (e.g. "importing a fixture row creates a node of the right
   type"). Write it → run (red) → minimum implementation → green.
2. **Slice 2 — widen the content:** assert the details (field values, references
   resolved, message format). Write → red → adjust → green.
3. **Slice 3+ — widen further:** one new dimension per test — idempotency (re-run
   creates no duplicates), negative/error cases, edge inputs. One test, red, green.

*Discipline:* write exactly ONE test; run the suite to watch it fail (red) before
implementing; write the minimum to pass; re-run to confirm green; only then the
next test. Don't batch all tests upfront, don't assert five things before the
wiring is proven, and don't skip the failing run — it's what proves the test has
value. Refactor at the end with tests green.

## Twig rules

**Twig = presentation only. Logic → preprocess.** No querying, loading entities,
or business logic in `.twig`.

1. **Render complete fields** — never drill into `content.field[0]['#markup']`; bypasses cache + access checks
2. **Use `|without` when excluding fields** — `{{ content|without('body') }}` preserves cache metadata
3. **Never use `|raw`** — disables escaping → XSS. Use `{{ content.field_text }}`
4. **No logic in templates** — move to a `*_preprocess_*()` hook
5. **Isolate includes** — `{{ include('<theme>:card', {heading: title}, with_context = false) }}`
6. **Use the Attribute object** — `attributes.addClass([...])`, not string-built attributes
7. **Bubble entity cache tags** — `{% set _c = content.field_image|render %}` before reading entity values directly

## Caching

Use cache metadata APIs — never inline tag strings like
`$build['#cache']['tags'][] = 'node:' . $id`.

- Services: expose `getCacheMetadata(): CacheableMetadata`
- Consumers: `addCacheableDependency($entity)` then `applyTo($build)`
- Blocks: declare tags in `getCacheTags()` via `Cache::mergeTags()`

## Code style & static analysis

`drupal/core-dev` provides the tooling (binaries in `vendor/bin`):

```bash
ddev exec vendor/bin/phpcs --standard=Drupal,DrupalPractice web/modules/custom
ddev exec vendor/bin/phpstan analyse web/modules/custom
```
