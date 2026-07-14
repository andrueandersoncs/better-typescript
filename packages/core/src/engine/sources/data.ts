import { Data, Schema } from "effect"
import type * as ts from "typescript"
import { TsNode, TsProgram, TsSourceFile, TsTypeChecker } from "../tsSchema.js"

/**
 * ProgramContext is the shared program, checker, projectRoot contract used by
 * runChecks, Check, and workspaceSignals.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class ProgramContext extends Schema.Class<ProgramContext>(
  "ProgramContext"
)({
  program: TsProgram,
  checker: TsTypeChecker,
  projectRoot: Schema.String
}) {}

/**
 * AstNodeElement is the shared node, context, sourceFile contract used by astNodes and
 * astNodesFromContext.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class AstNodeElement extends Schema.Class<AstNodeElement>(
  "AstNodeElement"
)({
  context: ProgramContext,
  sourceFile: TsSourceFile,
  node: TsNode
}) {}

/**
 * SourceUpdate is the shared context, changed, removed contract used by
 * diffCheckableFiles, workspaceUpdates, and sourceUpdates.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export class SourceUpdate extends Data.Class<{
  readonly context: ProgramContext
  readonly changed: ReadonlyArray<ts.SourceFile>
  readonly removed: ReadonlyArray<string>
}> {}
