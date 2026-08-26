# prefer-effect-function-constant

## What it does

Reports a synchronous, non-generator, non-generic zero-argument arrow or function expression with a concise expression body or exactly one `return`, when the returned value unwraps to a string/template/numeric/bigint/boolean/null literal or to an identifier for an earlier single-declaration same-file `const`. The report says: `Avoid a handwritten constant thunk.` It recommends `Function.constant(value)` from Effect.

Functions with parameters are allowed.

## When to use it

Use it for the synchronous, non-generator, non-generic constant-thunk shapes reported by this rule.

## Conformant

```ts
const identity = (value: number) => value
```

## Non-conformant

```ts
const answer = () => 42
```
