# require-export-jsdoc

## What it does

Requires JSDoc directly above an export to contain the standalone word `when`. It reports: `Exports need JSDoc that explains when to use them.` This includes declarations, export lists, re-exports, default exports, and `export =`. JSDoc that only describes the value is not enough.

## When to use it

Use it when every public export must include usage guidance.

## Conformant

```ts
/** Use this export when callers need the shared value. */
export const shared = 2
```

## Non-conformant

```ts
/** A documented value. */
export const missingUsageGuidance = 2
```
