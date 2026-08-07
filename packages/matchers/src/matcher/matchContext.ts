import { SourceComment } from "../sources/commentsData.js"
import { TsProgram } from "../tsProgram.js"
import { TsSourceFile } from "../tsSourceFile.js"
import { TsTypeChecker } from "../tsTypeChecker.js"
import { Schema } from "effect"

// sourceCommentsSchema lists SourceComment rows because MatchContext and scanners share one shape.
export const sourceCommentsSchema = Schema.Array(SourceComment)

// MatchContext carries checkers and comments because matchers share one per-file view.
export const MatchContext = Schema.Struct({
  program: TsProgram,
  checker: TsTypeChecker,
  projectRoot: Schema.String,
  workspaceRoot: Schema.String,
  sourceFile: TsSourceFile,
  comments: sourceCommentsSchema
})

export interface MatchContext extends Schema.Schema.Type<typeof MatchContext> {}
