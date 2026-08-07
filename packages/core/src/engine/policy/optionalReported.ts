import { Schema } from "effect"

// optionalReported is the reported key because silent policies omit that flag.
export const optionalReported = Schema.optionalKey(Schema.Boolean)
