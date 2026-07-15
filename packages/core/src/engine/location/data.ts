import { Effect, Schema, pipe } from "effect"

const defaultPosition = Effect.succeed(0)

/**
 * PositionSchema is the stable boundary representation exchanged with Location.
 *
 * @remarks
 *   It remains explicit because callers need one named contract for from, ast.
 *   Removing it would duplicate boundary translation and let wire and in-memory
 *   representations drift.
 * @modelRole boundary
 */
export const positionSchema = pipe(
  Schema.Int,
  Schema.withDecodingDefaultType(defaultPosition),
  Schema.withConstructorDefault(defaultPosition)
)

const optionalUnknown = Schema.optional(Schema.Unknown)

/**
 * Location is the shared path, line, column contract used by adviceLocation,
 * Advice, and Detection.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class Location extends Schema.Class<Location>("Location")({
  path: Schema.String,
  line: positionSchema,
  column: positionSchema
}) {}

/**
 * Detection is the shared location, message, hint, data contract used by
 * countDetectionsAtPath, signalOf, and Signal.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class Detection extends Schema.Class<Detection>("Detection")({
  location: Location,
  message: Schema.String,
  hint: Schema.String,
  data: optionalUnknown
}) {}
