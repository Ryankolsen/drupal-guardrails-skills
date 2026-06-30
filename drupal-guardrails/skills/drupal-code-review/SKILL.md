---
name: drupal-code-review
description: Review Drupal PHP, Twig, and config changes for bugs, side effects, and consistency. Use when reviewing pull requests, examining code changes, or when the user asks for a code review.
---

# Drupal PR Code Review

Senior-level review. Practical issues only, not style (run `vendor/bin/phpcs --standard=Drupal,DrupalPractice` for style).

## Process

1. Get diff: `git diff origin/main...HEAD`
2. Note modified `.theme`, `.module`, `.php`, `.twig`, `.yml`
3. Trace dependencies per function/hook

## Critical (Must Flag)

- **Secrets in code**: Hardcoded API keys, tokens, passwords, credentials in any committed file — `.yml`, `.env`, `.php`, settings files
- **Side effects**: Affects other templates, preprocess, or entity types?
- **Missing null checks**: `hasField()` + `isEmpty()` before field access
- **Render arrays**: Missing `#` prefix, wrong structure
- **Hook signatures**: Correct params and return types
- **Cache**: Missing cache tags/contexts when entity data changes
- **Input sanitization**: User input passed to queries, shell commands, or rendered output without sanitization (`Xss::filter`, `Html::escape`, parameterized queries)
- **Deleted fields**: Field removed → grep codebase for every reference — preprocess, templates, views, services, config YAML, migrations — ensure removed or updated. Confirm with user before deleting any field.

## Important (Should Flag)

- **Duplication**: Logic exists elsewhere → suggest helper/service
- **Pattern drift**: Deviates from project conventions
- **Error handling**: Try/catch around external or risky calls
- **A11y**: Missing ARIA, alt text, keyboard support
- **Twig & components**: Logic in templates (should be in preprocess); presentational UI not built as a Single Directory Component where one fits; SDC prop missing an `examples:` entry (breaks Canvas)

## Minor (Only if severe)

- PHPDoc, naming, formatting

## Output Format

```markdown
## PR Review: [Branch]

### Summary
[1-2 sentences]

### Security Issues
- **[File:Line]** - [Issue and fix]

### Critical Issues
- **[File:Line]** - [Issue and fix]

### Recommendations
- **[File]** - [Suggestion]

### Positive Notes
- [What was done well]
```

Omit **Security Issues** and **Critical Issues** sections entirely if empty.

## Philosophy

- Assume competence; suggest, don't demand ("consider", "might")
- Provide fixes, not just problems
- Verify against codebase before calling something "wrong"
