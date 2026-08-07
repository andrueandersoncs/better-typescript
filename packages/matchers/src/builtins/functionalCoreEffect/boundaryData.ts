import { Array, Schema } from "effect"
import { architectureRoleSchema } from "./architectureRoleSchema.js"

const boundaryKindLiterals = Array.make<
  [
    "dependency-direction",
    "domain-effect-program",
    "direct-capability",
    "runtime-execution",
    "dependency-provisioning",
    "port-live-implementation",
    "infrastructure-contract",
    "service-locator",
    "unsuspended-adapter-effect",
    "unscoped-resource",
    "escaping-runtime-state"
  ]
>(
  "dependency-direction",
  "domain-effect-program",
  "direct-capability",
  "runtime-execution",
  "dependency-provisioning",
  "port-live-implementation",
  "infrastructure-contract",
  "service-locator",
  "unsuspended-adapter-effect",
  "unscoped-resource",
  "escaping-runtime-state"
)

const boundaryKindSchema = Schema.Literals(boundaryKindLiterals)
const optionalArchitectureRoleSchema = Schema.optional(architectureRoleSchema)

// FunctionalCoreBoundaryData is detection payload because emission and advice share one record.
export const FunctionalCoreBoundaryData = Schema.Struct({
  kind: boundaryKindSchema,
  role: architectureRoleSchema,
  subject: Schema.String,
  targetRole: optionalArchitectureRoleSchema
})

export interface FunctionalCoreBoundaryData extends Schema.Schema.Type<
  typeof FunctionalCoreBoundaryData
> {}
