---
name: elicit-llm-creativity
description: Produce distinctive creative work by widening ideation, injecting external randomness, grounding choices in taste, and using independent critique. Use for concepts, prompts, designs, names, narratives, or other work where novelty and a strong point of view matter.
---

# Elicit LLM Creativity

Apply only as much of this method as the task needs.

## Generate distinct directions

- Explore many brief, substantially different directions before developing one. Include directions that initially seem unlikely to work.
- When the ideas cluster around familiar defaults, obtain a long random alphanumeric string from outside the model. Use its patterns, fragments, and numbers as inspiration for creative choices. Keep the seed out of the result.
- When the task already includes a prompt record, keep ambitious failed prompts for retesting with newer models.

## Apply taste

- Turn the user's tastes and references into concrete choices. Specify how they should influence a bold, ambitious direction.
- Draft or visualize promising directions, then revise from precise reactions about what works, what feels wrong, and what should change.

## Critique independently

For substantial creative work, use a fresh-context critic, preferably an independent subagent when available.

- Give the critic only the current output, concrete reference examples, and a clear quality bar. Ask for the largest specific gaps.
- Treat references as a quality baseline or moodboard, not as designs to copy.
- Revise the work using the critique while preserving the chosen direction.
