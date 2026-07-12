import { Function, Schema } from "effect"
import { TsNode } from "../tsSchema.js"

const zeroPosition: () => number = Function.constant(0)

export const positionSchema = Schema.optionalWith(Schema.Int, {
  default: zeroPosition
})

const optionalUnknown = Schema.optional(Schema.Unknown)

export class Location extends Schema.Class<Location>("Location")({
  path: Schema.String,
  line: positionSchema,
  column: positionSchema
}) {}

export class Detection extends Schema.Class<Detection>("Detection")({
  location: Location,
  message: Schema.String,
  hint: Schema.String,
  data: optionalUnknown
}) {}

export class DetectionSource extends Schema.Class<DetectionSource>(
  "DetectionSource"
)({
  node: TsNode,
  message: Schema.String,
  hint: Schema.String,
  data: optionalUnknown
}) {}
