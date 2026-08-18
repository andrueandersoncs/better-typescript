import { Schema } from "effect"
import { TsProgram } from "./tsProgram.js"

// LoadedProject is shared program/paths contract because owners need one term.
export const LoadedProject = Schema.Struct({
  program: TsProgram,
  configPath: Schema.String,
  rootPath: Schema.String
})

export interface LoadedProject extends Schema.Schema.Type<typeof LoadedProject> {}
