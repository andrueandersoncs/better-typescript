import { Schema } from "effect"
import { Location } from "./locationData.js"

const optionalUnknown = Schema.optional(Schema.Unknown)

// Detection is the shared finding contract because signal owners need one vocabulary.
export const Detection = Schema.Struct({
  location: Location,
  message: Schema.String,
  hint: Schema.String,
  data: optionalUnknown
})

export interface Detection extends Schema.Schema.Type<typeof Detection> {}
