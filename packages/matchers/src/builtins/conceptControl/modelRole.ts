import { Array, Schema } from "effect"

const modelRoles = Array.make<["shared", "boundary", "invariant", "protocol", "recursive"]>(
  "shared",
  "boundary",
  "invariant",
  "protocol",
  "recursive"
)

const modelRoleSchema = Schema.Literals(modelRoles)

// ModelRole is the shared role vocabulary because ConceptIndex and lists agree.
export type ModelRole = typeof modelRoleSchema.Type
