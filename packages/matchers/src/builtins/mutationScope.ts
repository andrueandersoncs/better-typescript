import { Array, Schema } from "effect"

const mutationScopes = Array.make<["shared-state", "local", "builtin"]>(
  "shared-state",
  "local",
  "builtin"
)

// MutationScope classifies mutation sites because local and external advice differ.
export const MutationScope = Schema.Literals(mutationScopes)

export type MutationScope = typeof MutationScope.Type
