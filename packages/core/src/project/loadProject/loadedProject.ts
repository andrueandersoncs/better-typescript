import { Schema } from "effect"
import { TsProgram } from "@better-typescript/matchers/tsProgram"

// LoadedProject is shared program/paths contract because owners need one term.
export const LoadedProject = Schema.Struct({
  program: TsProgram,
  configPath: Schema.String,
  rootPath: Schema.String
})

export interface LoadedProject extends Schema.Schema.Type<typeof LoadedProject> {}
