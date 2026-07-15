import { Data, MutableList, Schema } from "effect"
import type * as ts from "typescript"
import type { Detection } from "../location/data.js"
import type { ProgramContext } from "../sources/data.js"
import { TsNode, TsProgram, TsSourceFile, TsTypeChecker } from "../tsSchema.js"

/**
 * CheckContext is the shared program, checker, projectRoot, sourceFile contract
 * used by NodeHandler, runChecks, and nodeSubscriptions.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class CheckContext extends Schema.Class<CheckContext>("CheckContext")({
  program: TsProgram,
  checker: TsTypeChecker,
  projectRoot: Schema.String,
  sourceFile: TsSourceFile
}) {}

const optionalUnknown = Schema.optional(Schema.Unknown)

/**
 * DetectionSource is the boundary message, hint, data, node contract used by
 * MakeDetection and detection.
 *
 * @remarks
 *   It remains explicit because detection construction at the check boundary
 *   needs one named input contract distinct from emitted Detection values.
 *   Removing it would inline parallel object shapes at every detection call
 *   site and let message, hint, and node wiring drift.
 * @modelRole boundary
 */
export class DetectionSource extends Schema.Class<DetectionSource>("DetectionSource")({
  node: TsNode,
  message: Schema.String,
  hint: Schema.String,
  data: optionalUnknown
}) {}

export type NodeHandler = (context: CheckContext) => (node: ts.Node) => ReadonlyArray<Detection>

export type FileHandler = (context: CheckContext) => ReadonlyArray<Detection>

const onNodeKind = Schema.Literal("OnNode")
const syntaxKinds = Schema.Array(Schema.Number)
const onFileKind = Schema.Literal("OnFile")

/**
 * NodeSubscription is the shared kinds, handler contract used by
 * isNodeSubscription, PlannedNodeSubscription, and Subscription.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class NodeSubscription extends Schema.Class<NodeSubscription>("NodeSubscription")({
  kind: onNodeKind,
  kinds: syntaxKinds,
  handler: Schema.Any
}) {
  declare readonly kinds: ReadonlyArray<ts.SyntaxKind>
  declare readonly handler: NodeHandler
}

/**
 * FileSubscription is the shared handler contract used by isFileSubscription,
 * Subscription, and fileSubscription.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class FileSubscription extends Schema.Class<FileSubscription>("FileSubscription")({
  kind: onFileKind,
  handler: Schema.Any
}) {
  declare readonly handler: FileHandler
}

/**
 * Subscription is the shared handler contract used by isNodeSubscription,
 * combineAll, and runChecks.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export type Subscription = NodeSubscription | FileSubscription

/**
 * CachedPlan is the stable boundary representation exchanged with
 * withProgramIndex.
 *
 * @remarks
 *   It remains explicit because callers need one named contract for program,
 *   subscriptions. Removing it would duplicate boundary translation and let
 *   wire and in-memory representations drift.
 * @modelRole boundary
 */
export class CachedPlan extends Data.Class<{
  readonly program: ts.Program
  readonly subscriptions: ReadonlyArray<Subscription>
}> {}

/**
 * Check is the shared plan contract used by combineAll, runChecks, and
 * silentCheck.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class Check extends Data.Class<{
  readonly plan: (context: ProgramContext) => ReadonlyArray<Subscription>
}> {}

/**
 * PlannedNodeSubscription is the stable boundary representation exchanged with
 * runChecks.
 *
 * @remarks
 *   It remains explicit because callers need one named contract for checkIndex,
 *   subscription. Removing it would duplicate boundary translation and let wire
 *   and in-memory representations drift.
 * @modelRole boundary
 */
export class PlannedNodeSubscription extends Data.Class<{
  readonly checkIndex: number
  readonly subscription: NodeSubscription
}> {}

/**
 * ActiveNodeSubscription is the stable boundary representation exchanged with
 * runChecks.
 *
 * @remarks
 *   It remains explicit because callers need one named contract for checkIndex,
 *   handle, detections. Removing it would duplicate boundary translation and
 *   let wire and in-memory representations drift.
 * @modelRole boundary
 */
export class ActiveNodeSubscription extends Data.Class<{
  readonly checkIndex: number
  readonly handle: (node: ts.Node) => ReadonlyArray<Detection>
  readonly detections: MutableList.MutableList<Detection>
}> {}
