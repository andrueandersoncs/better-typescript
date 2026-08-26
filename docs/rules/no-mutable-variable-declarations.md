# no-mutable-variable-declarations

## What it does

Reports variable declarations made with `let` or `var`. Declarations made with `const` are allowed.

## When to use it

Use it to represent each state with a new immutable value. Use an Effect `Ref` when a value must evolve over time.

## Conformant

```ts
const value = 2
```

## Non-conformant

```ts
let value = 1
```
