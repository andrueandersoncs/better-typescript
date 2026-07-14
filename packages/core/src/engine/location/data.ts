import { Function, Schema } from "effect"
import { TsNode } from "../tsSchema.js"

const zeroPosition: () => number = Function.constant(0)

/**
 * positionSchema is the stable boundary representation exchanged with Location.
 *
 * @modelRole boundary
 * @remarks It remains explicit because callers need one named contract for from, ast.
 * Removing it would duplicate boundary translation and let wire and in-memory
 * representations drift.
 */
export const positionSchema = Schema.optionalWith(Schema.Int, {
  default: zeroPosition
})

const optionalUnknown = Schema.optional(Schema.Unknown)

/**
 * Location is the shared path, line, column contract used by adviceLocation, Advice,
 * and Detection.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
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
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class Detection extends Schema.Class<Detection>("Detection")({
  location: Location,
  message: Schema.String,
  hint: Schema.String,
  data: optionalUnknown
}) {}

/**
 * DetectionSource is the shared message, hint, data, node contract used by
 * MakeDetection and detection.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class DetectionSource extends Schema.Class<DetectionSource>(
  "DetectionSource"
)({
  node: TsNode,
  message: Schema.String,
  hint: Schema.String,
  data: optionalUnknown
}) {}
