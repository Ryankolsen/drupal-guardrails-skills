#!/usr/bin/env node
/**
 * @file
 * Validate that an SDC component.yml meets Drupal Canvas requirements.
 *
 * Canvas (Experience Builder) only surfaces a Single Directory Component when
 * every prop can be shape-matched into the editor form. The single most common
 * reason a valid SDC is invisible/unusable in Canvas is a prop with no
 * `examples` value. This checker flags that and a few other Canvas gotchas.
 *
 * Dependency-free: no YAML library required. It is indentation-aware and
 * targets the constrained structure of an SDC `*.component.yml` (2-space block
 * style). It checks for specific patterns rather than fully parsing YAML, which
 * keeps it reliable for both generated and hand-edited files.
 *
 * Usage:
 *   node validate-canvas-sdc.mjs path/to/foo.component.yml
 *
 * Exit code 0 = passes, 1 = problems found, 2 = usage/IO error.
 */

import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node validate-canvas-sdc.mjs <path/to/*.component.yml>');
  process.exit(2);
}

let raw;
try {
  raw = readFileSync(file, 'utf8');
} catch (err) {
  console.error(`Cannot read ${file}: ${err.message}`);
  process.exit(2);
}

// Strip comments and blank lines but keep original line numbers for messages.
const lines = raw.split(/\r?\n/).map((text, i) => {
  const noComment = text.replace(/\s+#.*$/, '').replace(/^\s*#.*$/, '');
  return { n: i + 1, text: noComment, indent: indentOf(noComment), raw: text };
});

function indentOf(s) {
  if (!s.trim()) return -1; // blank
  const m = s.match(/^(\s*)/);
  return m[1].replace(/\t/g, '  ').length;
}

// Find a top-level-ish key line by exact key name at the shallowest occurrence.
function findKey(name, fromIdx = 0, maxIndent = Infinity) {
  const re = new RegExp(`^(\\s*)${name}\\s*:(.*)$`);
  for (let i = fromIdx; i < lines.length; i++) {
    const l = lines[i];
    if (l.indent < 0) continue;
    if (l.indent > maxIndent) continue;
    const m = l.text.match(re);
    if (m) return { idx: i, indent: l.indent, inline: m[2].trim() };
  }
  return null;
}

// Collect the block of lines strictly more indented than `indent`, starting
// after `idx`, stopping at the first line whose indent <= `indent`.
function blockAfter(idx, indent) {
  const out = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.indent < 0) continue; // blank, keep scanning
    if (l.indent <= indent) break;
    out.push({ i, ...l });
  }
  return out;
}

const errors = [];
const warnings = [];

const props = findKey('props');
if (!props) {
  // A component with no props is fine for Canvas (e.g. pure-slot layout), but
  // worth noting so the author knows nothing will appear in the props form.
  warnings.push('No `props:` block found — component will expose no configurable inputs in Canvas.');
}

let properties = null;
let requiredNames = [];
if (props) {
  properties = findKey('properties', props.idx + 1, props.indent + 4);
  // Gather required prop names (sibling of `properties`, under `props`).
  const required = findKey('required', props.idx + 1, props.indent + 2);
  if (required && required.indent > props.indent) {
    for (const l of blockAfter(required.idx, required.indent)) {
      const m = l.text.match(/^\s*-\s*['"]?([^'"\n]+?)['"]?\s*$/);
      if (m) requiredNames.push(m[1].trim());
    }
  }
}

if (properties) {
  const propBlock = blockAfter(properties.idx, properties.indent);
  if (propBlock.length === 0) {
    warnings.push('`properties:` is empty.');
  }
  // Prop-name indent = the shallowest indent inside the properties block.
  const propIndent = Math.min(...propBlock.map((l) => l.indent));
  const propNameLines = propBlock.filter((l) => {
    if (l.indent !== propIndent) return false;
    return /^[^\s-][^:]*:\s*$/.test(l.text.trim() + (l.text.trim().endsWith(':') ? '' : ''))
      || /^[A-Za-z0-9_]+\s*:/.test(l.text.trim());
  });

  for (let p = 0; p < propNameLines.length; p++) {
    const propLine = propNameLines[p];
    const nameMatch = propLine.text.match(/^\s*([A-Za-z0-9_]+)\s*:/);
    if (!nameMatch) continue;
    const propName = nameMatch[1];
    const body = blockAfter(propLine.i, propLine.indent);
    const childIndent = body.length ? Math.min(...body.map((l) => l.indent)) : propLine.indent + 2;
    const childKeys = body.filter((l) => l.indent === childIndent);

    const has = (key) => childKeys.some((l) => new RegExp(`^\\s*${key}\\s*:`).test(l.text));
    const inlineNonEmpty = (key) => {
      const k = childKeys.find((l) => new RegExp(`^\\s*${key}\\s*:`).test(l.text));
      if (!k) return false;
      const after = k.text.split(/:(.*)/s)[1]?.trim() ?? '';
      // Either inline value (examples: ['x']) or a following sequence/block.
      if (after && after !== '') return true;
      const sub = blockAfter(k.i, childIndent);
      return sub.length > 0;
    };

    const isRequired = requiredNames.includes(propName);
    const type = (childKeys.find((l) => /^\s*type\s*:/.test(l.text))?.text || '').split(':')[1]?.trim();

    // RULE 1 — examples are mandatory in Canvas (always for required props,
    // and strongly needed otherwise so the prop has a usable default).
    if (!has('examples')) {
      const msg = `prop "${propName}": missing \`examples\` — Canvas needs it as the default/preview value.`;
      if (isRequired) errors.push(`${msg} (required prop — examples are mandatory)`);
      else errors.push(msg);
    } else if (!inlineNonEmpty('examples')) {
      errors.push(`prop "${propName}": \`examples\` is empty — provide at least one example value (it is a YAML array).`);
    }

    // RULE 2 — enum props read best in Canvas with human labels.
    if (has('enum') && !has('meta:enum')) {
      warnings.push(`prop "${propName}": has \`enum\` but no \`meta:enum\` — Canvas will show raw values instead of friendly labels.`);
    }

    // RULE 2b — an empty enum value makes Canvas mark the WHOLE component
    // ineligible and disable it (it never appears in the Library). Do NOT add
    // an empty option for "none": an optional prop (not in `required`) can be
    // left unset already.
    if (has('enum')) {
      const enumKey = childKeys.find((l) => /^\s*enum\s*:/.test(l.text));
      const items = [];
      const inlineEnum = enumKey.text.split(/:(.*)/s)[1]?.trim() ?? '';
      if (inlineEnum.startsWith('[')) {
        // enum: ['', accent]
        for (const m of inlineEnum.matchAll(/'([^']*)'|"([^"]*)"|([^,\[\]\s]+)/g)) {
          items.push(m[1] ?? m[2] ?? m[3] ?? '');
        }
      } else {
        for (const l of blockAfter(enumKey.i, childIndent)) {
          const m = l.text.match(/^\s*-\s*(.*)$/);
          if (m) items.push(m[1].trim().replace(/^['"]|['"]$/g, ''));
        }
      }
      if (items.some((v) => v === '')) {
        errors.push(`prop "${propName}": \`enum\` contains an empty value — Canvas rejects this and disables the entire component. Remove the empty option; leave the prop out of \`required\` so it can be unset instead.`);
      }
    }

    // RULE 3 — a "url"/"link"-ish string with no format renders as plain text.
    if (type === 'string' && /url|link|href/i.test(propName) && !has('format')) {
      warnings.push(`prop "${propName}": looks like a link but has no \`format\` — add \`format: uri-reference\` (or \`uri\`) for a proper Link field.`);
    }
  }
}

// Hard blockers unrelated to props.
const noUi = findKey('noUi');
if (noUi && /true/i.test(noUi.inline)) {
  errors.push('`noUi: true` hides this component from Canvas. Remove it to expose the component.');
}

// Report.
const rel = file;
if (errors.length === 0 && warnings.length === 0) {
  console.log(`✅ ${rel}: Canvas-ready.`);
  process.exit(0);
}
if (errors.length) {
  console.log(`❌ ${rel}: ${errors.length} blocker(s):`);
  for (const e of errors) console.log(`   - ${e}`);
}
if (warnings.length) {
  console.log(`⚠️  ${rel}: ${warnings.length} suggestion(s):`);
  for (const w of warnings) console.log(`   - ${w}`);
}
process.exit(errors.length ? 1 : 0);