import { Schema } from "effect"
import { FileDetections } from "@better-typescript/core/engine/derive/data"

const fileDetectionsArray = Schema.Array(FileDetections)

// DirectorySignals is shared path/files/total contract because advice owners need one shape.
export const DirectorySignals = Schema.Struct({
  path: Schema.String,
  files: fileDetectionsArray,
  projectTotal: Schema.Number
})

export interface DirectorySignals extends Schema.Schema.Type<typeof DirectorySignals> {}
