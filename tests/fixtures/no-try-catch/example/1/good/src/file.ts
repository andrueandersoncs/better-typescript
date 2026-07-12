import { Effect, Schema, pipe } from "effect"

class ReadError extends Schema.TaggedError<ReadError>("ReadError")(
  "ReadError",
  {}
) {}

interface Config {
  readonly name: string
}

declare const path: string
declare const readFile: (path: string) => Effect.Effect<string, ReadError>
declare const parse: (data: string) => Effect.Effect<Config>
declare const defaultValue: Config

export const program = pipe(
  readFile(path),
  Effect.flatMap(parse),
  Effect.catchTag("ReadError", () => Effect.succeed(defaultValue))
)
