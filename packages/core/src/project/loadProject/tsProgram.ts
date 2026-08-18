import { Predicate, Schema } from "effect"
import type * as ts from "typescript"

const isTsProgram = (input: unknown): input is ts.Program =>
  Predicate.hasProperty(input, "getTypeChecker")

// TsProgram bridges TypeScript into schemas because compiler programs have no native Effect schema.
export const TsProgram = Schema.declare(isTsProgram, { identifier: "ts.Program" })
