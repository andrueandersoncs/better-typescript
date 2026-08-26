# no-error-type

## What it does

Reports type references that resolve to the built-in `Error` type. A local type named `Error` is allowed.

## When to use it

Use it to require specific tagged errors, preserved generic error types, or `unknown` at untyped boundaries.

## Conformant

```ts
type Error = { readonly message: string }
const failure: Error = { message: "local" }
```

## Non-conformant

```ts
const messageOf = (error: Error): string => error.message
```
