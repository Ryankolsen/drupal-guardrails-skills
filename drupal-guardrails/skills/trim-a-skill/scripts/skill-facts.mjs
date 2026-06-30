#!/usr/bin/env node
// skill-facts.mjs — extract "fact-bearing" tokens from skill markdown so a trim
// can be proven lossless. Dependency-free.
//
// Facts = inline `code` spans, fenced code-block lines, URLs, file-ish paths,
// config keys (dotted lowercase), and ALL_CAPS magic tokens. These are the parts
// of a skill that carry irreplaceable knowledge; prose is not counted.
//
// Usage:
//   node skill-facts.mjs <file-or-dir>             # print the sorted fact set
//   node skill-facts.mjs <before> <after>          # print facts in <before> missing
//                                                  # from <after>; exit 1 if any lost
// Each path may be a single .md file or a directory (all *.md scanned).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function mdFiles(path) {
  const st = statSync(path);
  if (st.isFile()) return [path];
  const out = [];
  for (const e of readdirSync(path)) {
    const p = join(path, e);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...mdFiles(p));
    else if (e.endsWith('.md')) out.push(p);
  }
  return out;
}

function extractFacts(text) {
  const facts = new Set();
  const add = (s) => {
    const t = s.trim();
    if (t.length >= 3) facts.add(t);
  };

  // Fenced code blocks: every non-empty, non-comment line is a fact.
  const fence = /```[^\n]*\n([\s\S]*?)```/g;
  let m;
  let body = text;
  while ((m = fence.exec(text))) {
    for (const line of m[1].split('\n')) {
      const l = line.trim();
      if (l && !l.startsWith('#') && !l.startsWith('//')) add(l);
    }
  }
  // Remove fenced blocks before scanning prose so we don't double-count.
  body = text.replace(fence, '\n');

  // Inline `code` spans.
  for (const mm of body.matchAll(/`([^`]+)`/g)) add(mm[1]);

  // URLs.
  for (const mm of body.matchAll(/https?:\/\/[^\s)`'"]+/g)) add(mm[0]);

  // Dotted config-key-ish tokens (e.g. canvas.component.sdc.x, system.site).
  for (const mm of body.matchAll(/\b[a-z][a-z0-9_]*(?:\.[a-z0-9_]+){2,}\b/g)) add(mm[0]);

  // ALL_CAPS magic tokens (constants, env vars) of length >= 4.
  for (const mm of body.matchAll(/\b[A-Z][A-Z0-9_]{3,}\b/g)) add(mm[0]);

  return facts;
}

function factsFor(path) {
  const all = new Set();
  for (const f of mdFiles(path)) {
    for (const x of extractFacts(readFileSync(f, 'utf8'))) all.add(x);
  }
  return all;
}

const [, , a, b] = process.argv;
if (!a) {
  console.error('usage: skill-facts.mjs <file-or-dir> [<after-file-or-dir>]');
  process.exit(2);
}

if (!b) {
  const facts = [...factsFor(a)].sort();
  for (const f of facts) console.log(f);
  console.error(`\n${facts.length} facts in ${a}`);
  process.exit(0);
}

const before = factsFor(a);
const after = factsFor(b);
const lost = [...before].filter((f) => !after.has(f)).sort();

if (lost.length === 0) {
  console.error(`✅ lossless — all ${before.size} facts from ${a} present in ${b}`);
  process.exit(0);
}
console.log(`❌ ${lost.length} fact(s) in ${a} missing from ${b}:\n`);
for (const f of lost) console.log(`  - ${f}`);
process.exit(1);
