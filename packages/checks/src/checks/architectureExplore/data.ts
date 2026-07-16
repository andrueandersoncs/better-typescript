import { Array, Schema } from "effect"

const passThroughKinds = Array.make<["reexport", "forwarding-call"]>("reexport", "forwarding-call")

const passThroughKind = Schema.Literals(passThroughKinds)

const leakageKinds = Array.make<["internal-path", "source-path"]>("internal-path", "source-path")

const leakageKind = Schema.Literals(leakageKinds)
const stringArray = Schema.Array(Schema.String)

// PassThroughWrapperData is wrapper evidence because advice correlates usage.
export class PassThroughWrapperData extends Schema.Class<PassThroughWrapperData>(
  "PassThroughWrapperData"
)({
  kind: passThroughKind,
  exportCount: Schema.Number,
  callerCount: Schema.Number,
  callerPaths: stringArray,
  hasNonCallReference: Schema.Boolean
}) {}

// InterfaceBurdenData is one size observation because advice compares both.
export class InterfaceBurdenData extends Schema.Class<InterfaceBurdenData>("InterfaceBurdenData")({
  operationCount: Schema.Number,
  requiredParameterCount: Schema.Number
}) {}

// ModuleGraphData is import-edge evidence because advice avoids graph rebuilds.
export class ModuleGraphData extends Schema.Class<ModuleGraphData>("ModuleGraphData")({
  importedPaths: stringArray
}) {}

// TestOnlyExportData is test-only call evidence because advice separates seams.
export class TestOnlyExportData extends Schema.Class<TestOnlyExportData>("TestOnlyExportData")({
  testPaths: stringArray,
  testCallCount: Schema.Number
}) {}

// SeamLeakageData is one leakage class because remediation differs by kind.
export class SeamLeakageData extends Schema.Class<SeamLeakageData>("SeamLeakageData")({
  importedPath: Schema.String,
  depth: Schema.Number,
  kind: leakageKind,
  fromTest: Schema.Boolean
}) {}

// ExternalDependencyConstructionData pairs name and path because advice needs one fact.
export class ExternalDependencyConstructionData extends Schema.Class<ExternalDependencyConstructionData>(
  "ExternalDependencyConstructionData"
)({
  collaboratorName: Schema.String,
  importedPath: Schema.String
}) {}

// SingleAdapterSeamData compares adapter counts because seam judgment needs both sides.
export class SingleAdapterSeamData extends Schema.Class<SingleAdapterSeamData>(
  "SingleAdapterSeamData"
)({
  interfaceName: Schema.String,
  productionAdapterCount: Schema.Number,
  testAdapterCount: Schema.Number
}) {}
