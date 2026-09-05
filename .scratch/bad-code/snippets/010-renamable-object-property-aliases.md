# Renamable object property aliases

- ID: 010
- Added: 2026-09-05
- Source: paste
- Path: none

## Why it is bad

I don't like that the raw object properties are named something different when they could just be named the same and collapsed in that raw object declaration

## Code

```ts
const counterReduce = {
  Increment: incrementCount,
  Refresh: refreshCount,
  Refreshed: refreshedCount,
}

const CounterReducer = Reducer.make({
  initialState: 0,
  action: CounterActionSchema,
  operations: [FetchCount],
  reduce: counterReduce,
})
```

## Analysis

### Shape: Renamable object property aliases

- Observable shape: One object literal assigns three identifier values under different property names instead of using same-name shorthand.
- Existing rules: `no-value-aliases` checks whole `const` initializers, while `prefer-effect-schema-constructor` allows callable runtime records and does not require their members to use shorthand.
- Pattern: [renamable-object-property-aliases](../patterns/renamable-object-property-aliases.md)
- Emergence: new-prospective
- Reason: The repeated shape is AST-visible and has a direct replacement when the referenced bindings are project-owned and exist only under the corresponding property names; legitimate contract adaptation needs an explicit boundary.
