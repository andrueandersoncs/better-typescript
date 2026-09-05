# no-mutable-variable-declarations

## What it does

Reports variable declarations made with `let` or `var`. Declarations made with `const` are allowed.

## When to use it

Use it as the application-code default: represent each state with a new immutable value, and use an Effect `Ref` when shared state must evolve over time. An owned library kernel may use local mutable variables under explicit project policy, but this syntactic rule does not infer ownership or auto-exempt lexical mutation.

## Conformant

```ts
const value = 2
```

## Non-conformant

```ts
let value = 1
```
