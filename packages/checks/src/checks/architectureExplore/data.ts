import { Schema } from "effect"

const passThroughKind = Schema.Literal("reexport", "forwarding-call")
const hardwiredKind = Schema.Literal("constructor", "module-scope-effect")
const importedPathsArray = Schema.Array(Schema.String)

export class PassThroughWrapperData extends Schema.Class<PassThroughWrapperData>(
  "PassThroughWrapperData"
)({
  kind: passThroughKind,
  exportCount: Schema.Number
}) {}

export class WideThinExportData extends Schema.Class<WideThinExportData>(
  "WideThinExportData"
)({
  exportCount: Schema.Number,
  statementCount: Schema.Number
}) {}

export class ImportCallGraphData extends Schema.Class<ImportCallGraphData>(
  "ImportCallGraphData"
)({
  importCount: Schema.Number,
  outgoingCallCount: Schema.Number,
  importedPaths: importedPathsArray
}) {}

export class SingleUsePureExportData extends Schema.Class<SingleUsePureExportData>(
  "SingleUsePureExportData"
)({
  calleeCount: Schema.Number,
  callerPath: Schema.String
}) {}

export class SeamLeakageData extends Schema.Class<SeamLeakageData>(
  "SeamLeakageData"
)({
  importedPath: Schema.String,
  depth: Schema.Number
}) {}

export class HardwiredDependencyData extends Schema.Class<HardwiredDependencyData>(
  "HardwiredDependencyData"
)({
  kind: hardwiredKind
}) {}
