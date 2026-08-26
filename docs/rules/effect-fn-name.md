# effect-fn-name

## What it does

Reports a missing or invalid name on an `Effect.fn(...)` builder only when that builder is immediately invoked. Separately, it reports a direct arrow function, function expression, or object-literal first argument as unnamed even without an outer invocation. Matching is textual on property-access receivers ending in `Effect`; a string is accepted when it begins with two non-empty dot-separated parts.

## When to use it

Use this rule when stable Effect function names are needed for useful tracing and span data.

## Conformant

```ts
const loadUser = Effect.fn("UserRepo.load")(() =>
  Effect.succeed({ id: "user-1" }),
)
```

## Non-conformant

```ts
const loadUser = Effect.fn("load")(() =>
  Effect.succeed({ id: "user-1" }),
)
```
