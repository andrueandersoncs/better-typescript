# effect-test-style

## What it does

Reports the listed plain `it` call forms only when the call contains an inline arrow-function or function-expression callback—the rightmost such argument—whose rendered return type contains `Effect` or whose raw callback text contains `Effect.`. The file gate is a raw `@effect/vitest` substring. The report says: `Use it.effect for Effect tests.`

It checks `it(...)`, `it.only`, `it.skip`, `it.todo`, `it.concurrent`, `it.sequential`, and `it.each(...)`. It allows `it.effect(...)`.

## When to use it

Use it to run Effect tests with the Effect-aware test runtime and deterministic services.

## Conformant

```ts
import { it } from "@effect/vitest"
declare namespace Effect {
  function succeed<A>(value: A): Effect<A>
  type Effect<A> = { readonly value: A }
}

it.effect("works", () => Effect.succeed(1))
```

## Non-conformant

```ts
import { it } from "@effect/vitest"
declare namespace Effect {
  function succeed<A>(value: A): Effect<A>
  type Effect<A> = { readonly value: A }
}

it("works", () => Effect.succeed(1))
```
