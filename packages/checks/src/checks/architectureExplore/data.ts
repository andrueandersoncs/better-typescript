import { Schema } from "effect"

const passThroughKind = Schema.Literal("reexport", "forwarding-call")
const leakageKind = Schema.Literal("internal-path", "source-path")
const stringArray = Schema.Array(Schema.String)

export class PassThroughWrapperData extends Schema.Class<PassThroughWrapperData>(
  "PassThroughWrapperData"
)({
  kind: passThroughKind,
  exportCount: Schema.Number,
  callerCount: Schema.Number,
  callerPaths: stringArray,
  hasNonCallReference: Schema.Boolean
}) {}

export class InterfaceBurdenData extends Schema.Class<InterfaceBurdenData>(
  "InterfaceBurdenData"
)({
  operationCount: Schema.Number,
  requiredParameterCount: Schema.Number
}) {}

export class ModuleGraphData extends Schema.Class<ModuleGraphData>(
  "ModuleGraphData"
)({
  importedPaths: stringArray
}) {}

export class TestOnlyExportData extends Schema.Class<TestOnlyExportData>(
  "TestOnlyExportData"
)({
  testPaths: stringArray,
  testCallCount: Schema.Number
}) {}

export class SeamLeakageData extends Schema.Class<SeamLeakageData>(
  "SeamLeakageData"
)({
  importedPath: Schema.String,
  depth: Schema.Number,
  kind: leakageKind,
  fromTest: Schema.Boolean
}) {}

export class ExternalDependencyConstructionData extends Schema.Class<ExternalDependencyConstructionData>(
  "ExternalDependencyConstructionData"
)({
  collaboratorName: Schema.String,
  importedPath: Schema.String
}) {}

export class SingleAdapterSeamData extends Schema.Class<SingleAdapterSeamData>(
  "SingleAdapterSeamData"
)({
  interfaceName: Schema.String,
  productionAdapterCount: Schema.Number,
  testAdapterCount: Schema.Number
}) {}
