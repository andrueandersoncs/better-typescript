import { Effect, Schema, pipe } from "effect"

const defaultPosition = Effect.succeed(0)

// positionSchema is the Location position boundary because callers need one contract.
export const positionSchema = pipe(
  Schema.Int,
  Schema.withDecodingDefaultType(defaultPosition),
  Schema.withConstructorDefault(defaultPosition)
)

const optionalUnknown = Schema.optional(Schema.Unknown)

// Location is the shared path/line/column contract because owners need one vocabulary.
export class Location extends Schema.Class<Location>("Location")({
  path: Schema.String,
  line: positionSchema,
  column: positionSchema
}) {}

// Detection is the shared finding contract because signal owners need one vocabulary.
export class Detection extends Schema.Class<Detection>("Detection")({
  location: Location,
  message: Schema.String,
  hint: Schema.String,
  data: optionalUnknown
}) {}
