# prefer-pipe-function

## What it does

Reports calls to Effect's `.pipe()` method. Use the standalone `pipe` function instead.

## When to use it

Use it to keep Effect pipelines in one function-call form. Unrelated methods named `pipe` are allowed.

## Conformant

```ts
import { Effect, pipe } from "effect"
export const value = pipe(Effect.succeed(1), Effect.map((n) => n + 1))
```

## Non-conformant

```ts
import { Effect } from "effect"
export const value = Effect.succeed(1).pipe(Effect.map((n) => n + 1))
```
