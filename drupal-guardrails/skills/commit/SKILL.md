---
name: commit
description: Commit changes following the conventions for the current repo — split unrelated changes into separate logical commits, write brief messages that explain WHY the change was made, and never add a Co-Authored-By / authored-by trailer. Use when the user asks to commit, stage and commit, or save changes to git.
---

# Commit changes

## Rules

1. **One logical change per commit.** Group the diff by intent, not by file. If
   the working tree mixes unrelated changes (a feature + a doc trim + a
   pre-existing staged change you didn't make), make a separate commit for each —
   never bundle them. Surface anything staged that you didn't touch instead of
   sweeping it in.
2. **Brief message, but say WHY.** Subject ≤ ~60 chars, imperative mood. The body
   (when one is needed) explains the *reason* for the change — the problem,
   constraint, or goal — not a restatement of the diff. Skip the body for changes
   whose reason is obvious from the subject.
3. **No trailers.** Never add `Co-Authored-By`, "Generated with", or any
   authored-by line. Plain message only.
4. **Commit to `main` directly** — no feature branch, unless the repo's CLAUDE.md says otherwise.
5. **Only commit when asked.** Don't push unless the user says so.

## Workflow

1. `git status` + `git diff` (and `git diff --staged`) — understand every hunk
   and whether anything is already staged that isn't yours.
2. Group hunks into logical chunks. For each chunk, commit **only its paths** so
   other pending changes stay untouched:
   ```bash
   git commit path/a path/b -m "subject" -m "why this changed"
   ```
   (Pathspec commits ignore the rest of the index — a clean way to isolate one
   chunk and leave unrelated staged work alone.) Repeat per chunk.
3. `git log --oneline -n <count>` to confirm the commits landed as intended.

## Message shape

```
Trim build-a-view skill docs

SKILL.md was over the ~100-line target; push exhaustive detail into
REFERENCE.md so the always-loaded body stays lean.
```

- Subject: what changed, imperatively. Body: why — the motivation a future reader
  can't recover from the diff. One short paragraph is plenty.
- Bad (restates diff): "Move 80 lines from SKILL.md to REFERENCE.md."
- Good (gives reason): "Keep the always-loaded SKILL.md body lean."
