# effect-callback-signal-arity

## What it does

Reports an inline default initializer in the runtime parameter prefix that reduces JavaScript `function.length` below Effect's cancellation-signal threshold: before the first parameter of `Effect.promise` or `Effect.tryPromise`, including `tryPromise({ try })`, and before either of the first two parameters of `Effect.callback`. An optional TypeScript parameter without a default and a signal-free callback are allowed.

## When to use it

Effect injects an `AbortSignal` only when the callback's runtime arity reaches the API threshold. Keep an injected signal required, or deliberately use a signal-free callback for an independent fallback signal.

## Conformant

```ts lint=clean
import { Effect } from "effect"

const program = Effect.tryPromise((signal) => fetch("/items", { signal }))
```

## Non-conformant

```ts lint=error:4:36
import { Effect } from "effect"

declare const fallback: AbortSignal
const program = Effect.tryPromise((signal = fallback) => fetch("/items", { signal }))
```
