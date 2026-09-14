# no-chained-type-assertions

## What it does

Reports nested `as` and angle-bracket assertions. Chains containing only `as const` are allowed.

## When to use it

Use it to keep type evidence instead of fabricating it through assertion chains.

## Conformant

```ts
const value = input as User
```

## Non-conformant

```ts
const value = input as unknown as User
```
