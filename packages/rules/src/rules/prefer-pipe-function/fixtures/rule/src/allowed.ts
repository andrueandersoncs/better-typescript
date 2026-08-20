import { Effect, Option, pipe } from "effect"

// standalone pipe function call
const program = pipe(
  Effect.succeed(1),
  Effect.map((n) => n + 1)
)

// standalone pipe with Option
const value = pipe(
  Option.some(42),
  Option.map((n) => n * 2),
  Option.getOrElse(() => 0)
)

// standalone pipe on a variable
const opt = Option.some(10)
const doubled = pipe(
  opt,
  Option.map((n) => n * 2)
)

// non-pipe method call should not be flagged
const arr = [1, 2, 3]
const mapped = arr.map((n) => n + 1)

// property access named pipe that is not a call
const config = { pipe: "value" }
const p = config.pipe
