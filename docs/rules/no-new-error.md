# no-new-error

## What it does

Reports direct `new Error(...)` expressions. The report says to avoid using `new Error()` directly and use a custom error instead.

## When to use it

Use this rule when code must create named error types instead of bare `Error` values. Other constructors are allowed.

## Conformant

```ts
class CustomError extends Error {}
const error = new CustomError()
```

## Non-conformant

```ts
const error = new Error("failure")
```
