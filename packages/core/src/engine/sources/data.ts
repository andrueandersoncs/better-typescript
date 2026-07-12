import { Data, Schema } from "effect"
import type * as ts from "typescript"
import { TsNode, TsProgram, TsSourceFile, TsTypeChecker } from "../tsSchema.js"

export class ProgramContext extends Schema.Class<ProgramContext>(
  "ProgramContext"
)({
  program: TsProgram,
  checker: TsTypeChecker,
  projectRoot: Schema.String
}) {}

export class AstNodeElement extends Schema.Class<AstNodeElement>(
  "AstNodeElement"
)({
  context: ProgramContext,
  sourceFile: TsSourceFile,
  node: TsNode
}) {}

export class SourceUpdate extends Data.Class<{
  readonly context: ProgramContext
  readonly changed: ReadonlyArray<ts.SourceFile>
  readonly removed: ReadonlyArray<string>
}> {}
