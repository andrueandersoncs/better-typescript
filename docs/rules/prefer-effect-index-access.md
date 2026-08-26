# prefer-effect-index-access

## What it does

Reports direct element access on arrays and tuples. The report says: `Avoid direct array and tuple index access.` It recommends `Array.get`, `Array.headNonEmpty`, or `Tuple.get` as appropriate.

Element access on a plain record is allowed.

## When to use it

Use it to represent missing array elements or preserve tuple position types.

## Conformant

```ts
const record = { first: 1 }
const first = record["first"]
```

## Non-conformant

```ts
const values = [1, 2, 3]
const first = values[0]
```
