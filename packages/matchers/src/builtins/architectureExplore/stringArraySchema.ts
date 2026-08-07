import { Schema } from "effect"

// stringArray is the shared string-list schema because bond evidence freezes string arrays once.
export const stringArray = Schema.Array(Schema.String)
