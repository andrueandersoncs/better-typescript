import { Schema } from "effect"

// ImportedNameUsage counts one imported binding because callers weigh use per name.
export const ImportedNameUsage = Schema.Struct({
  name: Schema.String,
  referenceCount: Schema.Number,
  callCount: Schema.Number
})

export interface ImportedNameUsage extends Schema.Schema.Type<typeof ImportedNameUsage> {}
