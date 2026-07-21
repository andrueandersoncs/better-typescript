import { Predicate, Schema } from "effect"
import type * as ts from "typescript"

const isTsProgram = (input: unknown): input is ts.Program =>
  Predicate.hasProperty(input, "getTypeChecker")

const isTsTypeChecker = (input: unknown): input is ts.TypeChecker =>
  Predicate.hasProperty(input, "getTypeAtLocation")

const isTsSourceFile = (input: unknown): input is ts.SourceFile =>
  Predicate.hasProperty(input, "languageVersion")

// TsProgram is the shared ts.Program schema because program owners need one vocabulary.
export const TsProgram = Schema.declare(isTsProgram, {
  identifier: "ts.Program"
})

// TsTypeChecker is the shared TypeChecker schema because owners need one vocabulary.
export const TsTypeChecker = Schema.declare(isTsTypeChecker, {
  identifier: "ts.TypeChecker"
})

// TsSourceFile is the shared SourceFile schema because owners need one vocabulary.
export const TsSourceFile = Schema.declare(isTsSourceFile, {
  identifier: "ts.SourceFile"
})

const isTsNode = (input: unknown): input is ts.Node => Predicate.hasProperty(input, "kind")

// TsNode is the shared ts.Node schema because AST owners need one vocabulary.
export const TsNode = Schema.declare(isTsNode, {
  identifier: "ts.Node"
})
