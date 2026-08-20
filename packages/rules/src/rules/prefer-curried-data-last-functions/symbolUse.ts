import { Schema } from "effect"

// SymbolUse is shared use-flag fields because its owners need one vocabulary.
export const SymbolUse = Schema.Struct({
  hasContextualReference: Schema.Boolean,
  hasDirectCall: Schema.Boolean,
  hasOtherReference: Schema.Boolean
})

export interface SymbolUse extends Schema.Schema.Type<typeof SymbolUse> {}
