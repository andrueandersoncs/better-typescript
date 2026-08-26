# no-throw

## What it does

Reports every `throw` statement. It recommends yielding a custom tagged error instead.

## When to use it

Use this rule when failures must be explicit Effect errors. This rule only checks `throw`; creating an error without throwing it is allowed.

## Conformant

```ts
const makeError = () => new Error("failure")
```

## Non-conformant

```ts
function fail() {
  throw new Error("failure")
}
```
