import { Effect, Schema, pipe } from "effect"

const defaultPosition = Effect.succeed(0)

const positionSchema = pipe(
  Schema.Int,
  Schema.withDecodingDefaultType(defaultPosition),
  Schema.withConstructorDefault(defaultPosition)
)

const optionalUnknown = Schema.optional(Schema.Unknown)

// Location is the shared path/line/column contract because owners need one vocabulary.
export const Location = Schema.Struct({
  path: Schema.String,
  line: positionSchema,
  column: positionSchema
})

export interface Location extends Schema.Schema.Type<typeof Location> {}

// Detection is the shared finding contract because signal owners need one vocabulary.
export const Detection = Schema.Struct({
  location: Location,
  message: Schema.String,
  hint: Schema.String,
  data: optionalUnknown
})

export interface Detection extends Schema.Schema.Type<typeof Detection> {}
