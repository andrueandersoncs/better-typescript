import { Data, Schema } from "effect"
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
 * DetectionSource is the node, message, hint payload a check hands to
 * detection() before location resolution.
 *
 * @remarks
 *   It remains explicit because every check module would otherwise invent its own
 *   pre-location detection shape. Removing it would duplicate that contract
 *   across the 60+ check modules and let those representations drift.
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

/**
 * NodeSubscription is the shared kinds, handler contract used by
 * isNodeSubscription, nodeSubscription, and Subscription.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class NodeSubscription extends Data.Class<{
  readonly kind: "OnNode"
  readonly kinds: ReadonlyArray<ts.SyntaxKind>
  readonly handler: NodeHandler
}> {}

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
export class FileSubscription extends Data.Class<{
  readonly kind: "OnFile"
  readonly handler: FileHandler
}> {}

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
