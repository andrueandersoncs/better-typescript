import type * as ts from "typescript"
import { Predicate, Schema } from "effect"

export const isTsTypeChecker = (input: unknown): input is ts.TypeChecker =>
  Predicate.hasProperty(input, "getTypeAtLocation")

// TsTypeChecker is the shared TypeChecker schema because owners need one vocabulary.
export const TsTypeChecker = Schema.declare(isTsTypeChecker, {
  identifier: "ts.TypeChecker"
})
