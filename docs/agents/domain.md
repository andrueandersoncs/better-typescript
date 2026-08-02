# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root.
- **`adrs/`** at the repo root — read ADRs that touch the area you're about to work in.

If either does not exist, **proceed silently**. Don't flag its absence or suggest creating it upfront. The `/domain-modeling` skill creates domain docs lazily when terms or decisions are resolved.

## File structure

This repo uses a single-context layout:

```
/
├── CONTEXT.md
├── adrs/
└── packages/
```

## Use the glossary's vocabulary

When output names a domain concept, use the term defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If a needed concept is absent, reconsider whether the language belongs to the project or note a real gap for `/domain-modeling`.

## Flag ADR conflicts

If output contradicts an existing ADR, surface the conflict explicitly rather than silently overriding it.
