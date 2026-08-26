# no-non-null-assertion

## What it does

Reports non-null assertions. The `!` operator hides an absent case from the type checker.

## When to use it

Use this rule when nullable values must be handled with a fallback, an `Option`, or a checked type guard.

## Conformant

```ts
declare const maybe: string | undefined
const value = maybe ?? "fallback"
```

## Non-conformant

```ts
declare const maybe: string | undefined
const value = maybe!
```
