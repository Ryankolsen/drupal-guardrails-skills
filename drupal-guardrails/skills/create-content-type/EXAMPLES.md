# Route A — Drush / Entity API skeleton

Author a short PHP script and run it with `drush php:script`. Deterministic,
reviewable, and re-runnable if you guard each create with an existence check.

```php
use Drupal\node\Entity\NodeType;
use Drupal\taxonomy\Entity\Vocabulary;
use Drupal\field\Entity\FieldStorageConfig;
use Drupal\field\Entity\FieldConfig;
use Drupal\Core\Entity\Entity\EntityViewMode;
use Drupal\Core\Entity\Entity\EntityFormDisplay;
use Drupal\Core\Entity\Entity\EntityViewDisplay;

// 1. Vocabulary (if referenced).
if (!Vocabulary::load('my_vocab')) {
  Vocabulary::create(['vid' => 'my_vocab', 'name' => 'My Vocab'])->save();
}

// 2. Bundle.
if (!NodeType::load('my_type')) {
  NodeType::create(['type' => 'my_type', 'name' => 'My Type'])->save();
}

// 3. Each field: storage once, instance per bundle.
if (!FieldStorageConfig::loadByName('node', 'field_example')) {
  FieldStorageConfig::create([
    'field_name' => 'field_example',
    'entity_type' => 'node',
    'type' => 'integer',          // or decimal/string/entity_reference/...
    'cardinality' => 1,           // -1 for unlimited
    'settings' => [],             // e.g. ['precision' => 3, 'scale' => 2] for decimal,
  ])->save();                     //      ['target_type' => 'taxonomy_term'] for refs
}
if (!FieldConfig::loadByName('node', 'my_type', 'field_example')) {
  FieldConfig::create([
    'field_name' => 'field_example',
    'entity_type' => 'node',
    'bundle' => 'my_type',
    'label' => 'Example',
    'required' => TRUE,
    'settings' => [],             // entity_reference: ['handler' => 'default:taxonomy_term',
  ])->save();                     //   'handler_settings' => ['target_bundles' => ['my_vocab' => 'my_vocab']]]
}

// 4. (Optional) a dedicated view mode, e.g. 'card'.
if (!EntityViewMode::load('node.card')) {
  EntityViewMode::create(['id' => 'node.card', 'targetEntityType' => 'node', 'label' => 'Card'])->save();
}

// 5. Place fields on the form + view displays with setComponent()/removeComponent().
//    Load or create EntityFormDisplay::load('node.my_type.default') and
//    EntityViewDisplay::load("node.my_type.$mode"), then ->save().
```

Run it:

```bash
ddev drush php:script path/to/setup.php
```
