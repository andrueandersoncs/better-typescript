import { Effect } from "effect"
import { it as test } from "@effect/vitest"
test("runs an Effect", () => Effect.succeed(1))
test.prop("runs an Effect property", [], () => Effect.succeed(true))

const namedEffect = () => Effect.succeed(1)
test("runs a named Effect", namedEffect)

test.prop("returns from a branch", [], () => {
  if (true) return Effect.succeed(true)
})

type EffectAlias = Effect.Effect<number>
const aliasedEffect = (): EffectAlias => Effect.succeed(1)
test("runs an aliased Effect", aliasedEffect)
