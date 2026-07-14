import { Schema } from "effect"

const passThroughKind = Schema.Literal("reexport", "forwarding-call")
const hardwiredKind = Schema.Literal("constructor", "module-scope-effect")
const importedPathsArray = Schema.Array(Schema.String)

/**
 * Machine-readable evidence describing a re-export or forwarding-call wrapper.
 *
 * @modelRole boundary
 * @remarks This schema exists because report consumers distinguish wrapper mechanisms
 * and quantify the exported surface without parsing prose. Removing it would force
 * each consumer to recover kind and exportCount from unstable messages.
 */
export class PassThroughWrapperData extends Schema.Class<PassThroughWrapperData>(
  "PassThroughWrapperData"
)({
  kind: passThroughKind,
  exportCount: Schema.Number
}) {}

/**
 * Machine-readable evidence comparing a file's exports with its total statements.
 *
 * @modelRole boundary
 * @remarks This schema exists because report consumers need both counts to assess a
 * wide, thin interface without parsing prose. Removing it would duplicate count
 * extraction and threshold interpretation in downstream report tooling.
 */
export class WideThinExportData extends Schema.Class<WideThinExportData>(
  "WideThinExportData"
)({
  exportCount: Schema.Number,
  statementCount: Schema.Number
}) {}

/**
 * Machine-readable fan-out evidence for one file in the import and call graph.
 *
 * @modelRole boundary
 * @remarks This schema exists because report consumers correlate importCount,
 * outgoingCallCount, and importedPaths as one observation. Removing it would require
 * reconstructing graph evidence from unstable prose or parallel positional arrays.
 */
export class ImportCallGraphData extends Schema.Class<ImportCallGraphData>(
  "ImportCallGraphData"
)({
  importCount: Schema.Number,
  outgoingCallCount: Schema.Number,
  importedPaths: importedPathsArray
}) {}

/**
 * Machine-readable call evidence for a pure export used by one first-party caller.
 *
 * @modelRole boundary
 * @remarks This schema exists because report consumers need the caller path together
 * with the callee count to review the proposed collapse. Removing it would force them
 * to parse messages or repeat call-graph lookup.
 */
export class SingleUsePureExportData extends Schema.Class<SingleUsePureExportData>(
  "SingleUsePureExportData"
)({
  calleeCount: Schema.Number,
  callerPath: Schema.String
}) {}

/**
 * Machine-readable evidence for an import that crosses into a module's internals.
 *
 * @modelRole boundary
 * @remarks This schema exists because report consumers need the imported path and seam
 * depth as one validated observation. Removing it would force downstream tooling to
 * reparse paths and infer depth independently.
 */
export class SeamLeakageData extends Schema.Class<SeamLeakageData>(
  "SeamLeakageData"
)({
  importedPath: Schema.String,
  depth: Schema.Number
}) {}

/**
 * Machine-readable classification of a hardwired dependency site.
 *
 * @modelRole boundary
 * @remarks This schema exists because report consumers distinguish constructor wiring
 * from module-scope effects without parsing prose. Removing it would duplicate that
 * classification in every downstream consumer.
 */
export class HardwiredDependencyData extends Schema.Class<HardwiredDependencyData>(
  "HardwiredDependencyData"
)({
  kind: hardwiredKind
}) {}
