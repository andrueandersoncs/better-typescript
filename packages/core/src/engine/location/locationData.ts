import { Effect, Schema, pipe } from "effect"

const defaultPosition = Effect.succeed(0)

const positionSchema = pipe(
  Schema.Int,
  Schema.withDecodingDefaultType(defaultPosition),
  Schema.withConstructorDefault(defaultPosition)
)

// Location is the shared path/line/column contract because owners need one vocabulary.
export const Location = Schema.Struct({
  path: Schema.String,
  line: positionSchema,
  column: positionSchema
})

export interface Location extends Schema.Schema.Type<typeof Location> {}
