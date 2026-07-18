import { Schema } from "effect"
import { TsProgram, TsTypeChecker } from "../tsSchema.js"

// ProgramContext is the shared program/checker/root contract because owners need one.
export const ProgramContext = Schema.Struct({
  program: TsProgram,
  checker: TsTypeChecker,
  projectRoot: Schema.String,
  workspaceRoot: Schema.String
})

export interface ProgramContext extends Schema.Schema.Type<typeof ProgramContext> {}
