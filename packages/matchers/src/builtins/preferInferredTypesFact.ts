import { Schema } from "effect"
import { PreferInferredTypesKind } from "./preferInferredTypesKind.js"

// PreferInferredTypesFact classifies inference site because const, return, and contextual advice d.
export const PreferInferredTypesFact = Schema.Struct({
  kind: PreferInferredTypesKind
})

export interface PreferInferredTypesFact extends Schema.Schema.Type<
  typeof PreferInferredTypesFact
> {}
