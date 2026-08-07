import type * as ts from "typescript"
import { Predicate, Schema } from "effect"

export const isTsProgram = (input: unknown): input is ts.Program =>
  Predicate.hasProperty(input, "getTypeChecker")

// TsProgram is the shared ts.Program schema because program owners need one vocabulary.
export const TsProgram = Schema.declare(isTsProgram, {
  identifier: "ts.Program"
})
