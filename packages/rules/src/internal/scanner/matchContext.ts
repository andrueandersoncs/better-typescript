import { SourceComment } from "../sources/commentsData.js"
import { TsProgram } from "../tsProgram.js"
import { TsSourceFile } from "../tsSourceFile.js"
import { TsTypeChecker } from "../tsTypeChecker.js"
import { Schema } from "effect"

// sourceCommentsSchema exists because its fields form one stable data contract used by the linter.
export const sourceCommentsSchema = Schema.Array(SourceComment)

// MatchContext exists because its fields form one stable data contract used by the linter.
export const MatchContext = Schema.Struct({
  program: TsProgram,
  checker: TsTypeChecker,
  projectRoot: Schema.String,
  workspaceRoot: Schema.String,
  sourceFile: TsSourceFile,
  comments: sourceCommentsSchema
})

export interface MatchContext extends Schema.Schema.Type<typeof MatchContext> {}
