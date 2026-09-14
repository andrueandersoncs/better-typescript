# no-shape-in-symbol-names

## What it does

Reports the case-insensitive substring `shape` in locally owned symbol names. Static member reads such as `schema.shape` are allowed.

## When to use it

Use it to name symbols for their domain role rather than their structure.

## Conformant

```ts
const fields = schema.shape
```

## Non-conformant

```ts
type PayloadShape = { id: string }
```
