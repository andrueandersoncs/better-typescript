import { Schema } from "effect"

export type ArchitectureRole = "domain" | "port" | "application" | "adapter" | "root" | "test"

export const architectureRoleSchema = Schema.Literal(
  "domain",
  "port",
  "application",
  "adapter",
  "root",
  "test"
)

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

const boundaryKindSchema = Schema.Literal(
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

export class FunctionalCoreBoundaryData extends Schema.Class<FunctionalCoreBoundaryData>(
  "FunctionalCoreBoundaryData"
)({
  kind: boundaryKindSchema,
  role: architectureRoleSchema,
  subject: Schema.String,
  targetRole: Schema.optional(architectureRoleSchema)
}) {}

export type FunctionalCoreShapeKind =
  "effect-orchestrator" | "adapter-business-logic" | "thick-composition-root" | "pure-service"

const shapeKindSchema = Schema.Literal(
  "effect-orchestrator",
  "adapter-business-logic",
  "thick-composition-root",
  "pure-service"
)

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
