import { Data, Schema } from "effect"
import type * as ts from "typescript"
import type { Detection } from "../location/data.js"
import type { ProgramContext } from "../sources/data.js"
import { SourceComment } from "../sources/commentsData.js"
import { TsNode, TsProgram, TsSourceFile, TsTypeChecker } from "../tsSchema.js"

const sourceCommentsSchema = Schema.Array(SourceComment)

// CheckContext is the shared check-file contract because owners need one vocabulary.
export class CheckContext extends Schema.Class<CheckContext>("CheckContext")({
  program: TsProgram,
  checker: TsTypeChecker,
  projectRoot: Schema.String,
  workspaceRoot: Schema.String,
  sourceFile: TsSourceFile,
  comments: sourceCommentsSchema
}) {}

const optionalUnknown = Schema.optional(Schema.Unknown)

// DetectionSource is boundary detection input because it differs from emitted Detection.
export class DetectionSource extends Schema.Class<DetectionSource>("DetectionSource")({
  node: TsNode,
  message: Schema.String,
  hint: Schema.String,
  data: optionalUnknown
}) {}

type NodeHandler = (context: CheckContext) => (node: ts.Node) => ReadonlyArray<Detection>

type FileHandler = (context: CheckContext) => ReadonlyArray<Detection>

// NodeSubscription carries syntax kinds because planners group node handlers for fused dispatch.
export class NodeSubscription extends Data.Class<{
  readonly kinds: ReadonlyArray<ts.SyntaxKind>
  readonly handler: NodeHandler
}> {}

// FileSubscription carries a file handler because it runs once per included source file.
export class FileSubscription extends Data.Class<{
  readonly handler: FileHandler
}> {}

// Subscription is the shared handler union because check planners need one vocabulary.
export type Subscription = NodeSubscription | FileSubscription

// Check is the shared plan contract because runChecks owners need one vocabulary.
export class Check extends Data.Class<{
  readonly plan: (context: ProgramContext) => ReadonlyArray<Subscription>
  readonly compilerOptions: ts.CompilerOptions
}> {}
