import { Schema } from "effect"

/**
 * ArchitectureRole is the protocol vocabulary for functional-core module
 * placement.
 *
 * @remarks
 *   This union exists because boundary and shape checks must classify the same
 *   role literals. Removing it would duplicate role strings across detectors
 *   and let their accepted placements drift.
 * @modelRole protocol
 */
export type ArchitectureRole = "domain" | "port" | "application" | "adapter" | "root" | "test"

const architectureRoleSchema = Schema.Literal(
  "domain",
  "port",
  "application",
  "adapter",
  "root",
  "test"
)

const optionalArchitectureRoleSchema = Schema.optional(architectureRoleSchema)

/**
 * FunctionalCoreBoundaryKind is the protocol vocabulary for boundary violation
 * kinds.
 *
 * @remarks
 *   This union exists because detectors and advice copy must key the same kind
 *   literals. Removing it would duplicate strings and desynchronize
 *   remediation.
 * @modelRole protocol
 */
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

/**
 * FunctionalCoreBoundaryData is the boundary payload attached to boundary
 * detections.
 *
 * @remarks
 *   It remains explicit because check emission and advice derivation exchange one
 *   stable evidence record. Removing it would duplicate field contracts across
 *   those owners and let kind, role, and subject wiring drift.
 * @modelRole boundary
 */
export class FunctionalCoreBoundaryData extends Schema.Class<FunctionalCoreBoundaryData>(
  "FunctionalCoreBoundaryData"
)({
  kind: boundaryKindSchema,
  role: architectureRoleSchema,
  subject: Schema.String,
  targetRole: optionalArchitectureRoleSchema
}) {}

/**
 * FunctionalCoreShapeKind is the protocol vocabulary for shape advice kinds.
 *
 * @remarks
 *   This union exists because shape evidence and advice copy tables must key the
 *   same kinds. Removing it would duplicate literals and desynchronize advice.
 * @modelRole protocol
 */
export type FunctionalCoreShapeKind =
  "effect-orchestrator" | "adapter-business-logic" | "thick-composition-root" | "pure-service"

const shapeKindSchema = Schema.Literal(
  "effect-orchestrator",
  "adapter-business-logic",
  "thick-composition-root",
  "pure-service"
)

/**
 * FunctionalCoreShapeData is the boundary payload attached to shape evidence.
 *
 * @remarks
 *   It remains explicit because silent shape checks and derive advice must share
 *   one metrics record. Removing it would restate counts in both owners and let
 *   thresholds diverge.
 * @modelRole boundary
 */
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
