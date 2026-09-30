# no-inline-closures

## What it does

Reports arrow functions unless their effective immediate parent is a variable declaration or another arrow, or they are passed to a function or constructor resolved from an external declaration. External declarations include package declarations and standard-library APIs such as `Promise`. The effective parent ignores parentheses, `as`, `satisfies`, and non-null wrappers. Currying is exempt only for an arrow nested this way directly under another arrow. An arrow returned by a block-bodied curried function is reported.

## When to use it

Use it to make closures easy to find and reuse. Name the function and pass it by reference.

## Conformant

```ts
const identity = (value: number) => value
const promised = new Promise<void>((resolve) => { resolve() })
```

## Non-conformant

```ts
const wrapped = { run: (value: number) => value }
```
