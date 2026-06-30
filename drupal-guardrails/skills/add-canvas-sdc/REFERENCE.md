# Canvas prop shapes — exact YAML

Drop these under `props: > properties:`. **Every prop needs `examples:`** (Canvas
uses the first as the default/preview); without it the component won't appear.
Twig usage is shown inline.

```yaml
# String (single-line)        →  <h2>{{ heading }}</h2>
heading:
  type: string
  title: Heading
  examples: ['Build with confidence']

# String with HTML (CKEditor) →  <div>{{ body }}</div>
body:
  type: string
  title: Body
  contentMediaType: text/html
  x-formatting-context: block
  examples: ['<p>This is <strong>formatted</strong> text.</p>']

# Textarea (multi-line plain) →  <p>{{ summary|nl2br }}</p>
summary:
  type: string
  title: Summary
  $ref: json-schema-definitions://canvas.module/textarea
  examples: ["Line one\nLine two"]

# Boolean (checkbox)          →  {% if show_image %}…{% endif %}
show_image:
  type: boolean
  title: 'Show image'
  examples: [true]

# Integer (number + bounds)   →  <div style="padding-top: {{ spacing }}px">
spacing:
  type: integer
  title: 'Spacing (px)'
  minimum: 0
  maximum: 200
  examples: [20]

# Number (decimal/float)      →  {{ rating|number_format(1) }}
rating:
  type: number
  title: Rating
  minimum: 0
  maximum: 10
  examples: [7.1]

# Date (date picker)          →  <time datetime="{{ event_date }}">{{ event_date|date('F j, Y') }}</time>
event_date:
  type: string
  format: date
  title: 'Event date'
  examples: ['2026-06-07']

# Array (list of values)      →  {% for tag in tags %}<span>{{ tag }}</span>{% endfor %}
tags:
  type: array
  title: Tags
  items:
    type: string
  maxItems: 10
  examples: [['Drupal', 'Canvas', 'SDC']]
```

## Link (URL field)
`format: uri-reference` → relative **or** absolute (`/about`, `https://…`).
`format: uri` → absolute only (must include a scheme). A bare string renders as
a plain text box.
```yaml
url:
  type: string
  title: URL
  format: uri-reference
  examples: ['/about', 'https://www.drupal.org']
```

## Enum (dropdown) — always add `meta:enum` labels
```yaml
alignment:
  type: string
  title: Alignment
  enum: [left, center, right]
  meta:enum:
    left: Left aligned
    center: Center aligned
    right: Right aligned
  examples: [center]
```
⚠️ **Never put an empty value in an `enum`** (e.g. `enum: ['', accent]` for a
"none" option). Canvas rejects the whole component — it becomes ineligible and
is auto-disabled on every cache rebuild, so it never appears in the Library. To
make a choice optional, leave the prop out of `required:`; the author can leave
it unset. Guard the Twig for the unset case:
`<div class="box {{ alignment ? 'box--' ~ alignment }}">`.

## Image object (media library / upload)
```yaml
image:
  type: object
  title: Image
  $ref: json-schema-definitions://canvas.module/image
  examples:
    - src: '/sites/default/files/example.jpg'
      alt: 'Example image'
      width: 800
      height: 600
```
Twig: `{% include 'canvas:image' with image only %}`

## Slots (drop zones — no `examples`)
```yaml
slots:
  content:
    title: Content
    description: 'Arbitrary renderable content.'
```
Twig: `{% block content %}{% endblock %}`

## Required props
List names under `required:` (sibling of `properties:`). Required props **must**
have `examples`; Canvas marks them in the sidebar and blocks saving until filled.
```yaml
props:
  type: object
  required: [heading]
  properties:
    heading:
      type: string
      examples: ['Hot']
```

## Built-in validations from format / type
- `format: email | date | date-time` validate automatically.
- Strings: `minLength`, `maxLength`. Numbers: `minimum`, `maximum`. Arrays: `minItems`, `maxItems`.

---

## Composing components (a component that includes another)

A component can render another SDC (e.g. a card embedding a rating). Include the
child by plugin id and pass its props explicitly:

```twig
{{ include('<theme>:rating_stars', { rating: rating }, with_context = false) }}
```

- **Always pass `with_context = false`** — otherwise the parent's whole context
  (including its `attributes` object) leaks into the child, reusing the parent's
  CSS classes and stray variables. SDC gives the child a fresh `attributes`;
  isolating context keeps it clean.
- Pass only the props the child declares; map names inline.
- Guard a child's **required** props at the include site (`{% if value is not null %}`).
- **Never pass an explicit `null` for a typed prop.** SDC throws
  `InvalidComponentException` when a typed prop receives `null` — even an
  *optional* one. Omit the key instead: build the props object conditionally
  with `merge`, or `array_filter(..., fn($v) => $v !== NULL)` in preprocess.

  ```twig
  {% set badges = {} %}
  {% if play_time is not null %}{% set badges = badges|merge({ play_time: play_time }) %}{% endif %}
  {% if badges is not empty %}{{ include('<theme>:badge_row', badges, with_context = false) }}{% endif %}
  ```

## Derive presentation in the component, not in preprocess

Canvas passes prop values **straight to the component** — there is no preprocess
hook in the Canvas render path. Any presentational math that turns a prop into
markup (fill percentage, pip/star count, rounded label) must live in the
**component Twig**, computed from props. (Preprocess still maps *entity fields*
to props when rendered through a node template — but the component must stand on
its own with raw prop values in Canvas.)

## Accessibility for visual components (gauges, meters, ratings)

- **Never convey value by color alone** (WCAG 1.4.1). Pair every gauge/meter/star
  row with a text/numeric readout.
- Expose the visual as one labelled image: `role="img"` + descriptive
  `aria-label` (e.g. `"Rated 7.1 out of 10"`) on the wrapper; mark decorative
  glyphs/pips `aria-hidden="true"` so AT hears the label once, not per star.
- If a visible numeric readout duplicates the aria-label, mark it `aria-hidden="true"`.
- Filled vs empty pips should differ by luminance, not hue alone (~3:1 contrast, WCAG 1.4.11).

## More
- Canvas ships an **"all-props" test SDC** demonstrating every shape:
  `web/modules/contrib/canvas/tests/modules/sdc_test_all_props/components/all-props/`.
- Full docs: `web/modules/contrib/canvas/docs/user/src/content/docs/sdc-components/`.