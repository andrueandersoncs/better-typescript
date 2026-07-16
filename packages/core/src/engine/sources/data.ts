import { Schema } from "effect"
import { TsProgram, TsTypeChecker } from "../tsSchema.js"

// ProgramContext is the shared program/checker/root contract because owners need one.
export class ProgramContext extends Schema.Class<ProgramContext>("ProgramContext")({
  program: TsProgram,
  checker: TsTypeChecker,
  projectRoot: Schema.String,
  workspaceRoot: Schema.String
}) {}
