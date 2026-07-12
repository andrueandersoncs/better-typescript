import { Schema } from "effect"
import { FileDetections } from "@better-typescript/core/engine/derive/data"

const fileDetectionsArray = Schema.Array(FileDetections)

export class DirectorySignals extends Schema.Class<DirectorySignals>(
  "DirectorySignals"
)({
  path: Schema.String,
  files: fileDetectionsArray,
  projectTotal: Schema.Number
}) {}
