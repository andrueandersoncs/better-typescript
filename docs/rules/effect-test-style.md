# effect-test-style

## What it does

Reports an inline callback that returns a proven `Effect` from a resolved plain `@effect/vitest` `it` call, including an import alias and `it.prop(...)`. It resolves the imported API and the returned `Effect` type; text such as `"Effect.succeed"` is not evidence.

Use `it.effect(...)` for a test callback and `it.effect.prop(...)` for a property callback. It allows `it.effect`, `it.live`, manually run `Effect.runPromise` tests, and unrelated functions named `it`.

## When to use it

Use it when a test returns an Effect that the Effect-aware runner must execute.

## Conformant

```ts
import { Effect } from "effect"
import { it } from "@effect/vitest"

it.effect.prop("works", [], () => Effect.succeed(true))

it("checks manual execution", () => Effect.runPromise(Effect.succeed(1)))
```

## Non-conformant

```ts
import { Effect } from "effect"
import { it as test } from "@effect/vitest"

test.prop("works", [], () => Effect.succeed(true))
```
