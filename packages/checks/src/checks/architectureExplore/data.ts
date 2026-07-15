import { Schema } from "effect"

const passThroughKind = Schema.Literal("reexport", "forwarding-call")
const leakageKind = Schema.Literal("internal-path", "source-path")
const stringArray = Schema.Array(Schema.String)

/**
 * PassThroughWrapperData is machine-readable evidence for a re-export or
 * forwarding-call wrapper and its observable usage.
 *
 * @remarks
 *   It remains explicit because architecture advice must correlate the wrapper
 *   mechanism, surface size, callers, and non-call references. Removing it
 *   would force report consumers to reconstruct those facts from prose.
 * @modelRole boundary
 */
export class PassThroughWrapperData extends Schema.Class<PassThroughWrapperData>(
  "PassThroughWrapperData"
)({
  kind: passThroughKind,
  exportCount: Schema.Number,
  callerCount: Schema.Number,
  callerPaths: stringArray,
  hasNonCallReference: Schema.Boolean
}) {}

/**
 * InterfaceBurdenData quantifies the operations and required parameters exposed
 * by one candidate module interface.
 *
 * @remarks
 *   It remains explicit because architecture advice compares both dimensions as
 *   one observation. Removing it would duplicate counting and threshold
 *   interpretation in every report consumer.
 * @modelRole boundary
 */
export class InterfaceBurdenData extends Schema.Class<InterfaceBurdenData>("InterfaceBurdenData")({
  operationCount: Schema.Number,
  requiredParameterCount: Schema.Number
}) {}

/**
 * ModuleGraphData carries the normalized import edges used as architecture
 * evidence for one source module.
 *
 * @remarks
 *   It remains explicit because downstream advice needs the validated imported
 *   path set without rebuilding the program graph. Removing it would repeat
 *   graph traversal or require parsing unstable messages.
 * @modelRole boundary
 */
export class ModuleGraphData extends Schema.Class<ModuleGraphData>("ModuleGraphData")({
  importedPaths: stringArray
}) {}

/**
 * TestOnlyExportData records the test callers and call count for an export with
 * no production consumers.
 *
 * @remarks
 *   It remains explicit because architecture advice must distinguish a test seam
 *   from an unused export using shared call evidence. Removing it would force
 *   each consumer to repeat symbol and call-graph analysis.
 * @modelRole boundary
 */
export class TestOnlyExportData extends Schema.Class<TestOnlyExportData>("TestOnlyExportData")({
  testPaths: stringArray,
  testCallCount: Schema.Number
}) {}

/**
 * SeamLeakageData classifies one import that exposes a module's internal or
 * source path, including its depth and whether the caller is a test.
 *
 * @remarks
 *   It remains explicit because architecture advice applies different remediation
 *   to each leakage kind and caller context. Removing it would make downstream
 *   consumers reparse paths and infer that classification.
 * @modelRole boundary
 */
export class SeamLeakageData extends Schema.Class<SeamLeakageData>("SeamLeakageData")({
  importedPath: Schema.String,
  depth: Schema.Number,
  kind: leakageKind,
  fromTest: Schema.Boolean
}) {}

/**
 * ExternalDependencyConstructionData identifies a first-party module that
 * constructs an imported collaborator directly.
 *
 * @remarks
 *   It remains explicit because architecture advice needs both the collaborator
 *   name and import path as one validated observation. Removing it would
 *   duplicate dependency-resolution logic in every report consumer.
 * @modelRole boundary
 */
export class ExternalDependencyConstructionData extends Schema.Class<ExternalDependencyConstructionData>(
  "ExternalDependencyConstructionData"
)({
  collaboratorName: Schema.String,
  importedPath: Schema.String
}) {}

/**
 * SingleAdapterSeamData quantifies production and test adapters behind one
 * declared interface.
 *
 * @remarks
 *   It remains explicit because architecture advice must compare both adapter
 *   populations before judging the seam. Removing it would split the evidence
 *   into positional counts or repeat adapter classification downstream.
 * @modelRole boundary
 */
export class SingleAdapterSeamData extends Schema.Class<SingleAdapterSeamData>(
  "SingleAdapterSeamData"
)({
  interfaceName: Schema.String,
  productionAdapterCount: Schema.Number,
  testAdapterCount: Schema.Number
}) {}
