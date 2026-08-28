# prefer-effect-object

## What it does

Reports calls to built-in `Object` operations that have an Effect replacement:

- `Object.assign` → `Struct.assign`
- `Object.entries` → `Record.toEntries`
- `Object.fromEntries` → `Record.fromEntries`
- `Object.groupBy` → `Array.groupBy`
- `Object.hasOwn` and built-in `hasOwnProperty` → `Record.has`
- `Object.is` → `Equivalence.strictEqual`
- `Object.keys` → `Struct.keys` or `Record.keys`
- `Object.values` → `Record.values`

The checker distinguishes the built-in `Object` from a local value with the same name. Other reflection and prototype operations are allowed when Effect has no actionable replacement.

## When to use it

Use it to keep object transformation, equality, and collection operations inside Effect's programming model.

## Conformant

```ts
import { Record } from "effect"

const catalog = { users: 1 }
const entries = Record.toEntries(catalog)
const compiled = Record.fromEntries(entries)
```

## Non-conformant

```ts
const catalog = { users: 1 }
const entries = Object.entries(catalog)
const compiled = Object.fromEntries(entries)
```
