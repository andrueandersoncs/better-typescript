import { Schema } from "effect"
import { reportKeySchema } from "./reportKeySchema.js"

// SignalEvent is one tagged wire signal shape because NDJSON and pretty share it.
export const SignalEvent = Schema.TaggedStruct("signal", {
  key: reportKeySchema,
  text: Schema.String
})

export interface SignalEvent extends Schema.Schema.Type<typeof SignalEvent> {}
