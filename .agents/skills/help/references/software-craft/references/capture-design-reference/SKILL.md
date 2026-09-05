---
name: capture-design-reference
description: Capture trustworthy visual and interaction references and convert them into an original builder-ready design brief. Use for inspiration research, live-page analysis, full-page screenshots, motion capture, video analysis, asset sourcing, or reference-originality review.
---

# Capture Design Reference

## Inputs

The design question, candidate sources or discovery scope, target product context, capture controls, and originality constraints.

## Method

1. State the design question and select a small, diverse reference set that can answer it.
2. Record each source URL, date, viewport, state, and asset provenance. Deduplicate against existing captures.
3. Capture evidence from the live surface:
   - settled full page and key sections;
   - interaction start, transition, and end states;
   - video frames or screen recording when timing matters;
   - DOM/code facts only when they explain the observed mechanism.
4. When lazy or animated content breaks native full-page capture, warm the page, take overlapping settled viewport slices, stitch them, and reject blank bands or disagreement with the live page.
5. Separate observed facts from interpretation. Extract layout, hierarchy, type, color, material, imagery, motion, interaction, and likely implementation mechanism.
6. Build an originality ledger: reusable grammar, protected identity/signature elements, replacement direction, and asset-license status.
7. Convert the evidence into a builder-ready brief with section anatomy, states, motion, constraints, fallbacks, and direct source links. When product translation needs original direction or critique, use [elicit-llm-creativity](../../../elicit-llm-creativity/SKILL.md) proportionally.
8. Verify files, dimensions, crops, playback, links, duplicates, and manifest entries.

## Output

A source-traceable builder brief containing the captured mechanisms, provenance, product translation, and originality boundaries.

## Done

A builder can reproduce the useful mechanism without copying the source identity, and every visual claim is traceable to captured evidence.