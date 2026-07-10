import * as path from "node:path"
import { Schema } from "effect"
import type * as ts from "typescript"
import type { CheckContext } from "./check.js"
import { TsNode } from "./tsSchema.js"

const zeroPosition = (): number => 0

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

export type MakeDetection = (source: DetectionSource) => Detection

export const toRelativeFileName =
  (projectRoot: string) =>
  (fileName: string): string => {
    const relative = path.relative(projectRoot, fileName)

    return relative || fileName
  }

export const locateNode =
  (context: CheckContext) =>
  (node: ts.Node): Location => {
    const sourceFile = context.sourceFile
    const start = node.getStart(sourceFile)
    const position = sourceFile.getLineAndCharacterOfPosition(start)
    const fileName = toRelativeFileName(context.projectRoot)(
      sourceFile.fileName
    )

    return new Location({
      path: fileName,
      line: position.line + 1,
      column: position.character + 1
    })
  }

export const detection =
  (context: CheckContext): MakeDetection =>
  (source: DetectionSource): Detection => {
    const location = locateNode(context)(source.node)

    return new Detection({
      location,
      message: source.message,
      hint: source.hint,
      data: source.data
    })
  }
