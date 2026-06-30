---
name: trim-a-skill
description: Refactor an existing, bloated skill to use fewer tokens without losing knowledge — move on-demand detail into reference files, cut what the agent already knows, and tighten prose. Use when a SKILL.md is too long/verbose, exceeds ~100 lines, costs too many tokens, or the user asks to trim, slim, compress, refactor, or reorganize a skill.
---

# Trim a skill

A skill's `description` is loaded into context for **every** session; its SKILL.md body is loaded **every time the skill fires**; bundled `REFERENCE.md`/`EXAMPLES.md`/`scripts/` cost **nothing until read**. Trimming = pushing rarely-needed detail down that ladder and cutting what the agent already knows — **without losing a single hard-won fact**. The win is a lean SKILL.md (target **≤ ~100 lines**), not a shorter skill overall.

The cardinal rule: **trimming is lossless for facts, lossy only for words.** Every gotcha, exact command, magic string, config key, and canonical-example pointer must still exist *somewhere* afterward — moved, not deleted. "Somewhere" is the skill **or** a live file in the repo it points to (see "Point to live code").

## Workflow

1. **Baseline & snapshot.** Measure, and keep a pristine copy to diff against:
   ```bash
   wc -l skill-name/SKILL.md
   cp skill-name/SKILL.md /tmp/SKILL.before.md   # or rely on git HEAD
   ```

2. **Inventory the facts (sacred).** Read the whole skill and list every fact-bearing token — commands, code blocks, file paths, config keys, magic strings, URLs, numeric thresholds, named gotchas. The script does this deterministically:
   ```bash
   node .claude/skills/trim-a-skill/scripts/skill-facts.mjs skill-name/SKILL.md
   ```
   These survive the trim. Prose explaining them is negotiable; the tokens are not.

3. **Classify each chunk** into one of three buckets:
   - **Keep in SKILL.md** — the always-needed spine: the description (see rule below), the core workflow steps, and the *high-frequency* gotchas. Aim for the 80% path.
   - **Push to a reference file** — long enumerations, prop/shape tables, exhaustive option lists, troubleshooting trees, worked examples. These belong in `REFERENCE.md` or `EXAMPLES.md`, linked **one level deep** from SKILL.md.
   - **Cut entirely** — see "What to cut" below.

4. **Tighten the kept prose.** Convert paragraphs to checklists/tables, fuse redundant sentences, drop filler ("it's important to note", "as you can see", motivational framing). One idea per line.

5. **Move, don't delete.** Create the reference file(s), paste the on-demand detail in verbatim, and leave a one-line pointer in SKILL.md: `See [REFERENCE.md](REFERENCE.md) for prop shapes.` Keep links one level deep — no chains of references.

6. **Verify losslessness** — the non-negotiable gate. Diff the fact inventory; anything in the before-set missing from the after-set must reappear (in SKILL.md or a reference file) before you finish:
   ```bash
   node .claude/skills/trim-a-skill/scripts/skill-facts.mjs /tmp/SKILL.before.md skill-name/   # before vs whole dir
   ```
   Two-arg mode prints only **lost facts** and exits non-zero if any. Eyeball every line: each must either (a) reappear in the skill, or (b) be a verbatim snapshot of code that lives in a repo file you now point to (the script can't tell "relocated to canonical source" from "deleted" — you must). A *generic insight* in the dropped list is a real loss; restore it. Then confirm `wc -l` dropped and the description is unchanged.

## Never touch the `description`

The `description` is how the agent decides whether to load the skill at all — it is the one part that is *always* in context, so it is already the most token-efficient line in the file. Trimming it makes the skill **fail to trigger**, which is far costlier than a few extra chars. Leave it alone unless you are *adding* a missing trigger keyword.

## What to cut (lossy for words, never for facts)

- **What the agent already knows.** Generic git/Drupal/JS/shell explanation, language syntax, what a well-known command does. Keep only the *project-specific* or *non-obvious* part.
- **Repetition.** The same rule restated in three sections → state it once, reference it.
- **Filler & framing.** Hedges, pep talk, "this is important because…" when the instruction stands on its own.
- **Over-narrated obvious steps.** "Open the file, find the line, change it" → just the diff.
- **Snapshots of code that lives in the repo** — see below.

## Point to live code, don't snapshot it

A reference file costs no tokens until read, so trimming it is about **staleness, not tokens**. Code pasted into a skill is a *snapshot frozen at write time*; the real file keeps changing, and the skill quietly goes wrong. So:

- For anything with a canonical home in the repo — a config file, a plugin class, a test, a fixture — keep the **generic technique** (the steps, the API names, the hard-won gotcha) and **point to the live file** (`path/to/Thing.php`) instead of pasting its body. The pointer is always current; the snapshot rots.
- Reserve verbatim code in a skill for **generic, illustrative** snippets that have *no* canonical home (a skeleton with `<placeholders>`, a shape you'd copy-and-adapt).
- The test: "if this code changed in the repo, would the skill now be lying?" If yes, replace it with a pointer.

## What to preserve (the value)

- Every hard-won gotcha and its *why* (a one-clause why is worth keeping; a paragraph is not).
- Exact commands, flags, paths, config keys, magic strings, numeric thresholds.
- Pointers to the canonical in-repo example.
- The step ordering when order is load-bearing.

## Done when

- [ ] SKILL.md body ≤ ~100 lines (or you can name why it must be longer).
- [ ] `skill-facts.mjs` before-vs-after reports zero lost facts — or every dropped line is a repo-code snapshot now reachable through a pointer.
- [ ] `description` frontmatter unchanged (or only gained a trigger).
- [ ] Every reference link resolves and is one level deep.
- [ ] The skill still reads as a coherent procedure top-to-bottom.
