---
name: build-feature
description: Guides feature implementation using the tracer-bullet approach — build a thin end-to-end slice first, get feedback, then expand. Use when implementing any new feature or significant change.
---

# Build Feature (Tracer Bullets)

Build a tiny end-to-end slice first, get feedback, then expand.

## Why tracer bullets

A tracer bullet is a small slice through all layers (routing/controller or hook,
service, config, and the presentational component). It validates the architecture
early and catches integration issues before full implementation.

## Workflow

1. **Identify the thinnest slice** — the smallest thing touching every layer that demonstrates the feature working.
2. **Build only that slice** — hard-code data if needed; skip edge cases.
3. **Verify end-to-end** — confirm it renders correctly in the browser, and capture any config to `/config/sync`.
4. **Get feedback** — show the user before expanding.
5. **Expand iteratively** — add real data, edge cases, and polish one layer at a time.

## What counts as a slice

- New listing page: a View display (`build-a-view`) rendering one bundle as a card component
- New component: a Single Directory Component trio (`add-canvas-sdc`) with one prop wired from a preprocess hook
- New block: plugin → one piece of content → placed in a region
- New form: form class → one field → submit handler → confirmation message

Render the presentational layer as a **Single Directory Component** wherever it
fits — that's this repo's default (see `add-canvas-sdc`), with field→prop mapping
in a preprocess hook, not in Twig.

## Decision checklist before expanding

1. Does the architecture hold up across all layers?
2. Is the presentational layer an SDC where it makes sense?
3. Is config captured to `/config/sync` and round-tripped (`cex` → `cim`)?
4. Accessible (WCAG AA) at a basic level?
5. Is there a more Drupal-idiomatic way to do this?
