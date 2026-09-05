# Executable-plan review template

Copy this directory to the executable-plan destination. The generated artifact is version `2.0.0`.

For existing code, capture the genuine declaration baseline in `src/current/*` first. Preserve its relative local imports so current modules can only resolve current definitions. Entirely new work may use `currentCode: []`.

Change:

1. `src/plan-data.ts` — ordered stories; test inventory; paired `currentCode` and `proposedCode` declarations with stable IDs; and their explicit dependency and Effect-contract metadata.
2. `src/current/*` — the untouched current declaration tree, when a baseline exists.
3. `src/domain/*` — proposed declaration source.
4. `src/story-tests/*` — one editable `@effect/vitest` Arbitrary property per item.
5. `src/styles.css` — optional theme tokens.

Use the declaration categories `Schema`, `Error`, `Service`, `Interface`, `Type`, and `EffectfulFunction`. `scopeGraph` is derived from SchemaAST composition and explicit metadata, not inferred compatible types or runtime call flow.

Keep `src/review-shell.tsx` and `review-server.ts` as shared review infrastructure unless the target repository owns equivalent code. Inspected declarative modules run top-level initialization and force lazy Schemas, so they must have no business side effects.

In the browser, review scope on the Three board or keyboard-accessible no-WebGL list, inspect exact current/proposed source in Monaco, then run story properties, approve explicitly, and export.

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:4174/`.
