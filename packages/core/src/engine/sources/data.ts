import { Data, Schema } from "effect"
import type * as ts from "typescript"
import { TsNode, TsProgram, TsSourceFile, TsTypeChecker } from "../tsSchema.js"

// ProgramContext is the shared program/checker/root contract because owners need one.
export class ProgramContext extends Schema.Class<ProgramContext>("ProgramContext")({
  program: TsProgram,
  checker: TsTypeChecker,
  projectRoot: Schema.String,
  workspaceRoot: Schema.String
}) {}

// AstNodeElement is the shared node walk element because AST owners need one vocabulary.
export class AstNodeElement extends Schema.Class<AstNodeElement>("AstNodeElement")({
  context: ProgramContext,
  sourceFile: TsSourceFile,
  node: TsNode
}) {}

// SourceUpdate is the shared change/remove batch because update owners need one vocabulary.
export class SourceUpdate extends Data.Class<{
  readonly context: ProgramContext
  readonly changed: ReadonlyArray<ts.SourceFile>
  readonly removed: ReadonlyArray<string>
}> {}
