import { Effect } from "effect"
const program = Effect.gen(function* () {
  const task = Effect.succeed(1)
  yield* task
})
