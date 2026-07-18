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
export const PassThroughWrapperData = Schema.Struct({
  kind: passThroughKind,
  exportCount: Schema.Number,
  callerCount: Schema.Number,
  callerPaths: stringArray,
  hasNonCallReference: Schema.Boolean
})

export interface PassThroughWrapperData extends Schema.Schema.Type<typeof PassThroughWrapperData> {}

// InterfaceBurdenData is one size observation because advice compares both.
export const InterfaceBurdenData = Schema.Struct({
  operationCount: Schema.Number,
  requiredParameterCount: Schema.Number,
  workspacePath: workspacePathSchema
})

export interface InterfaceBurdenData extends Schema.Schema.Type<typeof InterfaceBurdenData> {}

// ModuleGraphData carries project and workspace edges because advice joins graphs across packages.
export const ModuleGraphData = Schema.Struct({
  importedPaths: stringArray,
  workspacePath: Schema.String,
  importedWorkspacePaths: stringArray
})

export interface ModuleGraphData extends Schema.Schema.Type<typeof ModuleGraphData> {}

// TestOnlyExportData is test-only call evidence because advice separates seams.
export const TestOnlyExportData = Schema.Struct({
  testPaths: stringArray,
  testCallCount: Schema.Number
})

export interface TestOnlyExportData extends Schema.Schema.Type<typeof TestOnlyExportData> {}

// SeamLeakageData is one leakage class because remediation differs by kind.
export const SeamLeakageData = Schema.Struct({
  importedPath: Schema.String,
  depth: Schema.Number,
  kind: leakageKind,
  fromTest: Schema.Boolean
})

export interface SeamLeakageData extends Schema.Schema.Type<typeof SeamLeakageData> {}

// ExternalDependencyConstructionData pairs name and path because advice needs one fact.
export const ExternalDependencyConstructionData = Schema.Struct({
  collaboratorName: Schema.String,
  importedPath: Schema.String
})

export interface ExternalDependencyConstructionData extends Schema.Schema.Type<
  typeof ExternalDependencyConstructionData
> {}

// SingleAdapterSeamData compares adapter counts because seam judgment needs both sides.
export const SingleAdapterSeamData = Schema.Struct({
  interfaceName: Schema.String,
  productionAdapterCount: Schema.Number,
  testAdapterCount: Schema.Number
})

export interface SingleAdapterSeamData extends Schema.Schema.Type<typeof SingleAdapterSeamData> {}

// ImportedNameUsage counts one imported binding because callers weigh use per name.
export const ImportedNameUsage = Schema.Struct({
  name: Schema.String,
  referenceCount: Schema.Number,
  callCount: Schema.Number
})

export interface ImportedNameUsage extends Schema.Schema.Type<typeof ImportedNameUsage> {}

const importedNameUsageArray = Schema.Array(ImportedNameUsage)

// ImportUsageData records one import declaration because cross-package joins need raw specifiers.
export const ImportUsageData = Schema.Struct({
  specifier: Schema.String,
  importerWorkspacePath: Schema.String,
  fromTest: Schema.Boolean,
  names: importedNameUsageArray
})

export interface ImportUsageData extends Schema.Schema.Type<typeof ImportUsageData> {}

// ModuleIdentityData lists published aliases because specifier joins need file identity.
export const ModuleIdentityData = Schema.Struct({
  workspacePath: Schema.String,
  aliases: stringArray
})

export interface ModuleIdentityData extends Schema.Schema.Type<typeof ModuleIdentityData> {}

// ExportedSymbolUsage summarizes external references because deletion tests exclude the home file.
export const ExportedSymbolUsage = Schema.Struct({
  name: Schema.String,
  kind: exportedSymbolKind,
  referencingFileCount: Schema.Number,
  referencingTestFileCount: Schema.Number,
  callCount: Schema.Number
})

export interface ExportedSymbolUsage extends Schema.Schema.Type<typeof ExportedSymbolUsage> {}

const exportedSymbolUsageArray = Schema.Array(ExportedSymbolUsage)

// ExportSurfaceData lists one file's exports because workspace advice joins them to import usage.
export const ExportSurfaceData = Schema.Struct({
  workspacePath: Schema.String,
  symbols: exportedSymbolUsageArray
})

export interface ExportSurfaceData extends Schema.Schema.Type<typeof ExportSurfaceData> {}

// CompositionForwarderData is curried pipe-wrapper evidence because exact forwarding misses FP.
export const CompositionForwarderData = Schema.Struct({
  exportName: Schema.String,
  stepCount: Schema.Number,
  callerCount: Schema.Number,
  callerPaths: stringArray,
  hasNonCallReference: Schema.Boolean
})

export interface CompositionForwarderData extends Schema.Schema.Type<
  typeof CompositionForwarderData
> {}

// ModuleScopeEffectData classifies one effectful call because remediation differs by kind.
export const ModuleScopeEffectData = Schema.Struct({
  calleeText: Schema.String,
  kind: moduleScopeEffectKind
})

export interface ModuleScopeEffectData extends Schema.Schema.Type<typeof ModuleScopeEffectData> {}

// ContextTagSeamData counts adapters and consumers because Effect seams need both judgments.
export const ContextTagSeamData = Schema.Struct({
  serviceName: Schema.String,
  productionAdapterCount: Schema.Number,
  testAdapterCount: Schema.Number,
  consumerCount: Schema.Number
})

export interface ContextTagSeamData extends Schema.Schema.Type<typeof ContextTagSeamData> {}

// CompositionFingerprintData hashes one orchestration shape because duplication spans files.
export const CompositionFingerprintData = Schema.Struct({
  fingerprint: Schema.String,
  stepCount: Schema.Number,
  exportName: Schema.String
})

export interface CompositionFingerprintData extends Schema.Schema.Type<
  typeof CompositionFingerprintData
> {}
