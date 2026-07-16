import { Array, Schema } from "effect"

// ArchitectureRole is role vocabulary because boundary and shape checks need same literals.
export type ArchitectureRole = "domain" | "port" | "application" | "adapter" | "root" | "test"

const architectureRoles = Array.make<["domain", "port", "application", "adapter", "root", "test"]>(
  "domain",
  "port",
  "application",
  "adapter",
  "root",
  "test"
)

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
export class FunctionalCoreBoundaryData extends Schema.Class<FunctionalCoreBoundaryData>(
  "FunctionalCoreBoundaryData"
)({
  kind: boundaryKindSchema,
  role: architectureRoleSchema,
  subject: Schema.String,
  targetRole: optionalArchitectureRoleSchema
}) {}

// FunctionalCoreShapeKind is kind vocabulary because evidence and advice must share kind keys.
export type FunctionalCoreShapeKind =
  "effect-orchestrator" | "adapter-business-logic" | "thick-composition-root" | "pure-service"

const shapeKinds = Array.make<
  ["effect-orchestrator", "adapter-business-logic", "thick-composition-root", "pure-service"]
>("effect-orchestrator", "adapter-business-logic", "thick-composition-root", "pure-service")

const shapeKindSchema = Schema.Literals(shapeKinds)

// FunctionalCoreShapeData is shape payload because silent checks and derive share one record.
export class FunctionalCoreShapeData extends Schema.Class<FunctionalCoreShapeData>(
  "FunctionalCoreShapeData"
)({
  kind: shapeKindSchema,
  role: architectureRoleSchema,
  branchCount: Schema.Number,
  functionCount: Schema.Number,
  serviceCount: Schema.Number,
  effectfulMemberCount: Schema.Number,
  transformationCount: Schema.Number
}) {}
