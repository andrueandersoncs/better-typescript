---
name: design-interface
description: Design and implement distinctive production web interfaces with coherent art direction, accessible interaction, responsive behavior, and complete UI states. Use for pages, components, design systems, visual polish, library choice, or interface audits.
---

# Design Interface

## Inputs

The interface outcome, product content and personality, current framework and design system, supported viewports and inputs, and accessibility constraints.

## Method

1. Inspect the existing framework, routes, tokens, components, dependencies, content, and product personality.
2. Define the interface goal and one coherent art direction per production surface. When original direction or critique is needed, use [elicit-llm-creativity](../../../elicit-llm-creativity/SKILL.md) proportionally. Keep one direction per variant until the user selects the production direction.
3. Reuse project primitives and semantic tokens. Choose the least powerful state layer and an already-installed suitable library before adding a dependency.
4. Build focused components with clear data and presentation boundaries. Preserve realistic copy and data.
5. Complete every relevant state: loading, empty, error, success, disabled, optimistic, focus, hover, active, and responsive layouts.
6. Use semantic HTML, keyboard access, visible focus, correct labels, sufficient contrast, touch-sized targets, and sensible reading order.
7. Add visual techniques only when they reinforce the product idea. Treat style recipes as ingredients, not a template; combine a small compatible set and create an original identity.
8. Use [verify-change](../verify-change/SKILL.md) for generic web claim-to-observation checks. Verify the live surface at representative widths; exercise interactions; inspect its accessibility tree, overflow, and screenshots.

## Library decisions

Recommend one library for the actual task. Prefer the repository's current dependency. Verify current official documentation before relying on version-sensitive APIs. Keep [reference capture](../capture-design-reference/SKILL.md), [motion](../animate-interface/SKILL.md), and [WebGL](../build-immersive-web/SKILL.md) as bounded concerns within the selected interface result only when each is actually needed.

## Output

A production web interface with coherent art direction, complete relevant states, responsive behavior, and live-browser evidence.

## Done

The interface communicates one clear hierarchy and character, works through real interaction states, and remains usable across keyboard, touch, viewport, and reduced-capability conditions.