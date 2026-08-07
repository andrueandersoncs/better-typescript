import { Schema } from "effect"
import { Detection } from "../location/detectionData.js"

// NamedDetection is the shared name+detection pair because owners need one vocabulary.
export const NamedDetection = Schema.Struct({
  name: Schema.String,
  detection: Detection
})

export interface NamedDetection extends Schema.Schema.Type<typeof NamedDetection> {}
