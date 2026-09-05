import { Effect, Exit } from "effect"

type Job = Effect.Effect<void>
declare const work: () => Job

Effect.gen(function* () {
  Effect.log("discarded")
  yield* Effect.log("used")
  Effect.runSync(Effect.log("runner"))
  Exit.succeed(1)
  ;[1].forEach(() => Effect.log("nested"))
  return 1
})

Effect.fn("worker")(function* () {
  Effect.log("also discarded")
  return 1
})

Effect.fn(function* () {
  Effect.log("unnamed discarded")
  return 1
})

Effect.gen(function* () {
  work()
  return 1
})
