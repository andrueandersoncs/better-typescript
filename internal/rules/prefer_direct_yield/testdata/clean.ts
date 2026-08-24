import { Effect } from "effect"
const program = Effect.gen(function* () {
  yield* Effect.succeed(1)
})
