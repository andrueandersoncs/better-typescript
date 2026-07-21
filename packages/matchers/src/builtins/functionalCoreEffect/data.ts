import { Array, Schema } from "effect"
import { architectureRoles } from "../../support/architectureRole.js"

const architectureRoleSchema = Schema.Literals(architectureRoles)

const optionalArchitectureRoleSchema = Schema.optional(architectureRoleSchema)

// FunctionalCoreBoundaryKind is kind vocabulary because detectors and advice must share literals.
export type FunctionalCoreBoundaryKind =
  | "dependency-direction"
  | "domain-effect-program"
  | "direct-capability"
  | "runtime-execution"
  | "dependency-provisioning"
  | "port-live-implementation"
  | "infrastructure-contract"
  | "service-locator"
  | "unsuspended-adapter-effect"
  | "unscoped-resource"
  | "escaping-runtime-state"

const boundaryKinds = Array.make<
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

const boundaryKindSchema = Schema.Literals(boundaryKinds)

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

// FunctionalCoreShapeKind is kind vocabulary because evidence and advice must share kind keys.
export type FunctionalCoreShapeKind =
  "effect-orchestrator" | "adapter-business-logic" | "thick-composition-root" | "pure-service"

const shapeKinds = Array.make<
  ["effect-orchestrator", "adapter-business-logic", "thick-composition-root", "pure-service"]
>("effect-orchestrator", "adapter-business-logic", "thick-composition-root", "pure-service")

const shapeKindSchema = Schema.Literals(shapeKinds)

// FunctionalCoreShapeData is shape payload because silent checks and derive share one record.
export const FunctionalCoreShapeData = Schema.Struct({
  kind: shapeKindSchema,
  role: architectureRoleSchema,
  branchCount: Schema.Number,
  functionCount: Schema.Number,
  serviceCount: Schema.Number,
  effectfulMemberCount: Schema.Number,
  transformationCount: Schema.Number
})

export interface FunctionalCoreShapeData extends Schema.Schema.Type<
  typeof FunctionalCoreShapeData
> {}
