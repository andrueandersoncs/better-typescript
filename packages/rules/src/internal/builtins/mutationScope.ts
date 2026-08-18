import { Array, Schema } from "effect"

const mutationScopes = Array.make<["shared-state", "local", "builtin"]>(
  "shared-state",
  "local",
  "builtin"
)

// MutationScope exists because its fields form one stable data contract used by the linter.
export const MutationScope = Schema.Literals(mutationScopes)

export type MutationScope = typeof MutationScope.Type
