---
name: build-immersive-web
description: Build purposeful Three.js, WebGL, shader, particle, or cinematic-scroll experiences with semantic fallbacks and measured budgets. Use for interactive 3D, WebGL landing pages, shader effects, scroll worlds, procedural scenes, or high-impact visual storytelling.
---

# Build Immersive Web

## Inputs

The product message, semantic surface, requested visual experience, supported devices and inputs, assets, and performance constraints.

## Method

1. Define the message and choose one visual lane:
   - subtle field or atmosphere;
   - data or particle system;
   - object-centered product stage;
   - immersive scene or scroll world.
   When original visual direction, divergent exploration, or critique is needed, use [elicit-llm-creativity](../../../elicit-llm-creativity/SKILL.md) proportionally; retain one selected visual lane for the production surface.
2. Start with semantic content and a composed static fallback. Add the visual renderer as progressive enhancement.
3. Choose the narrowest proven mechanism. Use one scroll conductor and one primary renderer for a storytelling sequence.
4. Establish the scene graph, camera, renderer, responsive sizing, capability gate, and lifecycle cleanup before visual complexity.
5. Keep hot paths allocation-free. Cap device pixel ratio, draw calls, geometry, texture memory, particle count, ray work, and post-processing to measured budgets.
6. Make interaction reversible and input-aware. Preserve keyboard/touch access to product content; respect reduced motion and reduced capability.
7. Track asset source, license, scale, pivot, color space, compression, and fallback.
8. Verify startup, resize, scroll forward/reverse, long-session memory, hidden/offscreen behavior, mobile quality, teardown, and the actual frame budget.

## Design rule

Use effects as mechanisms, not identities. Select a small compatible recipe set and tune it to the product's content rather than reproducing a reference site's signature.

## Output

A purposeful immersive web experience with its semantic fallback, asset provenance, lifecycle cleanup, and measured runtime evidence.

## Done

The immersive layer strengthens the message, leaves the semantic experience intact, meets measured device budgets, and releases every owned resource.