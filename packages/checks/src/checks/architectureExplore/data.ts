import { Array, Effect, Schema, pipe } from "effect"

const passThroughKinds = Array.make<["reexport", "forwarding-call"]>("reexport", "forwarding-call")

const passThroughKind = Schema.Literals(passThroughKinds)

const leakageKinds = Array.make<["internal-path", "source-path"]>("internal-path", "source-path")

const leakageKind = Schema.Literals(leakageKinds)
const stringArray = Schema.Array(Schema.String)
const defaultWorkspacePath = Effect.succeed("")

const withDefaultWorkspacePath = Schema.withConstructorDefault(defaultWorkspacePath)
const workspacePathSchema = pipe(Schema.String, withDefaultWorkspacePath)

const moduleScopeEffectKinds = Array.make<["effect-run", "module-scope-io"]>(
  "effect-run",
  "module-scope-io"
)

const moduleScopeEffectKind = Schema.Literals(moduleScopeEffectKinds)

const exportedSymbolKinds = Array.make<["function", "class", "type", "value"]>(
  "function",
  "class",
  "type",
  "value"
)

const exportedSymbolKind = Schema.Literals(exportedSymbolKinds)

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
  requiredParameterCount: Schema.Number,
  workspacePath: workspacePathSchema
}) {}

// ModuleGraphData carries project and workspace edges because advice joins graphs across packages.
export class ModuleGraphData extends Schema.Class<ModuleGraphData>("ModuleGraphData")({
  importedPaths: stringArray,
  workspacePath: Schema.String,
  importedWorkspacePaths: stringArray
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

// ImportedNameUsage counts one imported binding because callers weigh use per name.
export class ImportedNameUsage extends Schema.Class<ImportedNameUsage>("ImportedNameUsage")({
  name: Schema.String,
  referenceCount: Schema.Number,
  callCount: Schema.Number
}) {}

const importedNameUsageArray = Schema.Array(ImportedNameUsage)

// ImportUsageData records one import declaration because cross-package joins need raw specifiers.
export class ImportUsageData extends Schema.Class<ImportUsageData>("ImportUsageData")({
  specifier: Schema.String,
  importerWorkspacePath: Schema.String,
  fromTest: Schema.Boolean,
  names: importedNameUsageArray
}) {}

// ModuleIdentityData lists published aliases because specifier joins need file identity.
export class ModuleIdentityData extends Schema.Class<ModuleIdentityData>("ModuleIdentityData")({
  workspacePath: Schema.String,
  aliases: stringArray
}) {}

// ExportedSymbolUsage summarizes external references because deletion tests exclude the home file.
export class ExportedSymbolUsage extends Schema.Class<ExportedSymbolUsage>("ExportedSymbolUsage")({
  name: Schema.String,
  kind: exportedSymbolKind,
  referencingFileCount: Schema.Number,
  referencingTestFileCount: Schema.Number,
  callCount: Schema.Number
}) {}

const exportedSymbolUsageArray = Schema.Array(ExportedSymbolUsage)

// ExportSurfaceData lists one file's exports because workspace advice joins them to import usage.
export class ExportSurfaceData extends Schema.Class<ExportSurfaceData>("ExportSurfaceData")({
  workspacePath: Schema.String,
  symbols: exportedSymbolUsageArray
}) {}

// CompositionForwarderData is curried pipe-wrapper evidence because exact forwarding misses FP.
export class CompositionForwarderData extends Schema.Class<CompositionForwarderData>(
  "CompositionForwarderData"
)({
  exportName: Schema.String,
  stepCount: Schema.Number,
  callerCount: Schema.Number,
  callerPaths: stringArray,
  hasNonCallReference: Schema.Boolean
}) {}

// ModuleScopeEffectData classifies one effectful call because remediation differs by kind.
export class ModuleScopeEffectData extends Schema.Class<ModuleScopeEffectData>(
  "ModuleScopeEffectData"
)({
  calleeText: Schema.String,
  kind: moduleScopeEffectKind
}) {}

// ContextTagSeamData counts adapters and consumers because Effect seams need both judgments.
export class ContextTagSeamData extends Schema.Class<ContextTagSeamData>("ContextTagSeamData")({
  serviceName: Schema.String,
  productionAdapterCount: Schema.Number,
  testAdapterCount: Schema.Number,
  consumerCount: Schema.Number
}) {}

// CompositionFingerprintData hashes one orchestration shape because duplication spans files.
export class CompositionFingerprintData extends Schema.Class<CompositionFingerprintData>(
  "CompositionFingerprintData"
)({
  fingerprint: Schema.String,
  stepCount: Schema.Number,
  exportName: Schema.String
}) {}
