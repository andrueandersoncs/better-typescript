# prefer-effect-record-filter-map

## What it does

Reports a conditional object spread with a non-empty object-literal branch and a branch with no object-literal properties, such as `{}`. The report says: `Avoid conditional object spreads.` It recommends `Record.filterMap` from Effect.

A conditional spread with two non-empty object literals is allowed.

## When to use it

Use it to keep only present candidate properties in a record.

## Conformant

```ts
declare const condition: boolean
const value = { ...(condition ? { name: "Ada" } : { name: "Grace" }) }
```

## Non-conformant

```ts
declare const condition: boolean
const value = { ...(condition ? { name: "Ada" } : {}) }
```
