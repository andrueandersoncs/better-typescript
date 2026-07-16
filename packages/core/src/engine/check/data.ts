import { Data, MutableList, Schema } from "effect"
import type * as ts from "typescript"
import type { Detection } from "../location/data.js"
import type { ProgramContext } from "../sources/data.js"
import { TsNode, TsProgram, TsSourceFile, TsTypeChecker } from "../tsSchema.js"

// CheckContext is the shared check-file contract because owners need one vocabulary.
export class CheckContext extends Schema.Class<CheckContext>("CheckContext")({
  program: TsProgram,
  checker: TsTypeChecker,
  projectRoot: Schema.String,
  workspaceRoot: Schema.String,
  sourceFile: TsSourceFile
}) {}

const optionalUnknown = Schema.optional(Schema.Unknown)

// DetectionSource is boundary detection input because it differs from emitted Detection.
export class DetectionSource extends Schema.Class<DetectionSource>("DetectionSource")({
  node: TsNode,
  message: Schema.String,
  hint: Schema.String,
  data: optionalUnknown
}) {}

export type NodeHandler = (context: CheckContext) => (node: ts.Node) => ReadonlyArray<Detection>

export type FileHandler = (context: CheckContext) => ReadonlyArray<Detection>

// NodeSubscription is the shared OnNode contract because planners need one vocabulary.
export class NodeSubscription extends Data.Class<{
  readonly kind: "OnNode"
  readonly kinds: ReadonlyArray<ts.SyntaxKind>
  readonly handler: NodeHandler
}> {}

// FileSubscription is the shared OnFile contract because planners need one vocabulary.
export class FileSubscription extends Data.Class<{
  readonly kind: "OnFile"
  readonly handler: FileHandler
}> {}

// Subscription is the shared handler union because check planners need one vocabulary.
export type Subscription = NodeSubscription | FileSubscription

// Check is the shared plan contract because runChecks owners need one vocabulary.
export class Check extends Data.Class<{
  readonly plan: (context: ProgramContext) => ReadonlyArray<Subscription>
}> {}

// CachedPlan is the program+subscriptions boundary because callers need one contract.
export class CachedPlan extends Data.Class<{
  readonly program: ts.Program
  readonly subscriptions: ReadonlyArray<Subscription>
}> {}

// PlannedNodeSubscription is a planned OnNode boundary because runChecks needs one shape.
export class PlannedNodeSubscription extends Data.Class<{
  readonly checkIndex: number
  readonly subscription: NodeSubscription
}> {}

// ActiveNodeSubscription is a live OnNode boundary because runChecks needs one shape.
export class ActiveNodeSubscription extends Data.Class<{
  readonly checkIndex: number
  readonly handle: (node: ts.Node) => ReadonlyArray<Detection>
  readonly detections: MutableList.MutableList<Detection>
}> {}
