import { Data, MutableList, Schema } from "effect"
import type * as ts from "typescript"
import type { Detection } from "../location/data.js"
import type { ProgramContext } from "../sources/data.js"
import { TsProgram, TsSourceFile, TsTypeChecker } from "../tsSchema.js"

export class CheckContext extends Schema.Class<CheckContext>("CheckContext")({
  program: TsProgram,
  checker: TsTypeChecker,
  projectRoot: Schema.String,
  sourceFile: TsSourceFile
}) {}

export type NodeHandler = (
  context: CheckContext
) => (node: ts.Node) => ReadonlyArray<Detection>

export type FileHandler = (context: CheckContext) => ReadonlyArray<Detection>

const onNodeKind = Schema.Literal("OnNode")
const syntaxKinds = Schema.Array(Schema.Number)
const onFileKind = Schema.Literal("OnFile")

export class NodeSubscription extends Schema.Class<NodeSubscription>(
  "NodeSubscription"
)({
  kind: onNodeKind,
  kinds: syntaxKinds,
  handler: Schema.Any
}) {
  declare readonly kinds: ReadonlyArray<ts.SyntaxKind>
  declare readonly handler: NodeHandler
}

export class FileSubscription extends Schema.Class<FileSubscription>(
  "FileSubscription"
)({
  kind: onFileKind,
  handler: Schema.Any
}) {
  declare readonly handler: FileHandler
}

export type Subscription = NodeSubscription | FileSubscription

export class CachedPlan extends Data.Class<{
  readonly program: ts.Program
  readonly subscriptions: ReadonlyArray<Subscription>
}> {}

export class Check extends Data.Class<{
  readonly plan: (context: ProgramContext) => ReadonlyArray<Subscription>
}> {}

export class PlannedNodeSubscription extends Data.Class<{
  readonly checkIndex: number
  readonly subscription: NodeSubscription
}> {}

export class ActiveNodeSubscription extends Data.Class<{
  readonly checkIndex: number
  readonly handle: (node: ts.Node) => ReadonlyArray<Detection>
  readonly detections: MutableList.MutableList<Detection>
}> {}
