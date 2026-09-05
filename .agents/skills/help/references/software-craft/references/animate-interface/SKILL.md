---
name: animate-interface
description: Find, design, implement, optimize, or review purposeful interface motion for web and Expo/React Native. Use for transitions, gestures, scroll effects, animation audits, motion polish, jank, reduced motion, or animation terminology.
---

# Animate Interface

## Inputs

The requested motion outcome, current interface or reference, supported platforms and inputs, and applicable performance and accessibility constraints.

## Choose the motion approach

These are procedure and output choices within `animate-interface`, not routes to other skills:

- Vague visible effect → name the motion and nearest alternatives.
- Missing motion → propose only justified opportunities and show deliberate rejections.
- New web motion → use CSS, WAAPI, or the existing motion library.
- Expo/React Native → use native navigation, Reanimated worklets, Gesture Handler, and sparse haptics.
- Existing focused diff → review against the motion contract below.
- Whole codebase → produce an inventory and prioritized findings. Implement selected findings only when implementation is requested.
- Original motion direction, divergent concepts, or critique needed → use [elicit-llm-creativity](../../../elicit-llm-creativity/SKILL.md) proportionally; keep frequency and purpose as the selection rule.

## Motion contract

1. Gate on **frequency** and **purpose**. Motion must provide feedback, continuity, spatial explanation, hierarchy, or rare delight.
2. Choose the cheapest native mechanism. Reuse tokens. Prefer compositor or UI-thread properties such as transform and opacity.
3. Set a correct transform origin, exact timing or spring values, coherent choreography, and a faster or simpler exit where appropriate.
4. Make interaction interruptible from the currently presented value. Preserve velocity for direct manipulation and momentum.
5. Pause hidden or offscreen loops, bound resources, avoid per-frame allocation/state updates, and dispose listeners, timelines, canvases, and GPU assets.
6. Provide a composed reduced-motion state, pointer/touch gating, text scaling, and non-motion feedback where meaning depends on movement.
7. Verify in slow motion or frame-by-frame, then at normal speed. For Expo, use a release build on a slow supported device; for web, inspect runtime frames, long-session behavior, resize, and teardown.

## Output

The named, implemented, or reviewed motion result with runtime and accessibility evidence appropriate to the request.

## Done

The motion has a named purpose, feels continuous under interruption, stays within its performance budget, and preserves meaning without animation.