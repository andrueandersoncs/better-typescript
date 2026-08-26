# prefer-effect-fn

## What it does

Reports a synchronous outer function that returns `Effect.gen`. The tested report says: `Avoid wrapping the body of load in Effect.gen; use Effect.fn.`

Async outer functions and generator outer functions are allowed.

## When to use it

Use it to make `Effect.fn` the outer function and move the generator body into it. Preserve any `this` binding.

## Conformant

```ts
import { Effect } from "effect"

const load = Effect.fn(function* () {
  return 1
})
```

## Non-conformant

```ts
import { Effect } from "effect"

const load = () => Effect.gen(function* () {
  return 1
})
```
