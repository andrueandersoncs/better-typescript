import { Schema } from "effect"

// EntityKey is portable because compiler objects cannot cross the snapshot seam.
export const SemanticModuleEntityKey = Schema.Struct({
  path: Schema.String,
  start: Schema.Number,
  end: Schema.Number,
  syntaxKind: Schema.Number
})

export interface SemanticModuleEntityKey extends Schema.Schema.Type<
  typeof SemanticModuleEntityKey
> {}
