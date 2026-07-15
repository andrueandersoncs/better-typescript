import { Effect, Option, pipe } from "effect"

// method pipe on Effect
const program = Effect.succeed(1).pipe(Effect.map((n) => n + 1))

// method pipe on Option
const value = Option.some(42).pipe(
  Option.map((n) => n * 2),
  Option.getOrElse(() => 0)
)

// chained method pipe
const chained = Option.fromNullishOr("hello").pipe(Option.map((s) => s.length))

// method pipe on a variable
const opt = Option.some(10)
const doubled = opt.pipe(Option.map((n) => n * 2))
