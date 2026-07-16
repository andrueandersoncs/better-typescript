import { Data, MutableList, Schema } from "effect"
import type * as ts from "typescript"
import type { NodeSubscription, Subscription } from "../check/data.js"
import type { Detection } from "../location/data.js"
import { TsProgram, TsTypeChecker } from "../tsSchema.js"

// ProgramContext is the shared program/checker/root contract because owners need one.
export class ProgramContext extends Schema.Class<ProgramContext>("ProgramContext")({
  program: TsProgram,
  checker: TsTypeChecker,
  projectRoot: Schema.String,
  workspaceRoot: Schema.String
}) {}

// SourceUpdate is the shared change/remove batch because update owners need one vocabulary.
export class SourceUpdate extends Data.Class<{
  readonly context: ProgramContext
  readonly changed: ReadonlyArray<ts.SourceFile>
  readonly removed: ReadonlyArray<string>
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
