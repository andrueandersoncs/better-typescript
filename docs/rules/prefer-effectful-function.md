# prefer-effectful-function

## What it does

Reports a named function declaration or untyped function-valued variable when its expression body or only return is Effect's `runSync(...)`. Only these direct sole-result wrappers are checked.

## When to use it

Use it to return Effects and compose callers with `yield*` or `Effect.flatMap`. Reserve direct `Effect.runSync` calls for the application runtime boundary.

## Conformant

```ts
import { Effect } from "effect"

export const runEffect = () => Effect.succeed(1)
```

## Non-conformant

```ts
import { Effect } from "effect"

const program = Effect.succeed(1)
export const run = () => Effect.runSync(program)
```
