import { Schema } from "effect"
import { NamedDetection } from "./namedDetection.js"

const namedDetectionArray = Schema.Array(NamedDetection)

// FileDetections is the shared path+elements pair because owners need one vocabulary.
export const FileDetections = Schema.Struct({
  path: Schema.String,
  elements: namedDetectionArray
})

export interface FileDetections extends Schema.Schema.Type<typeof FileDetections> {}
