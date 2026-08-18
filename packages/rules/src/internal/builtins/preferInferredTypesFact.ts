import { Schema } from "effect"
import { PreferInferredTypesKind } from "./preferInferredTypesKind.js"

// PreferInferredTypesFact exists because its fields form one stable data contract used by the linter.
export const PreferInferredTypesFact = Schema.Struct({
  kind: PreferInferredTypesKind
})

export interface PreferInferredTypesFact extends Schema.Schema.Type<
  typeof PreferInferredTypesFact
> {}
