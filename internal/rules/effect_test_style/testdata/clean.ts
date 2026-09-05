import { Effect } from "effect"
import { it as test } from "@effect/vitest"

test.effect("runs an Effect", () => Effect.succeed(1))
test.effect.prop("runs an Effect property", [], () => Effect.succeed(true))
test("runs manually", () => Effect.runPromise(Effect.succeed(1)))
test("mentions Effect", () => {
  const description = "Effect.succeed"
  void description
})

const localIt = (name: string, callback: () => void): void => {
  void name
  callback()
}
localIt("unrelated", () => Effect.succeed(1))
