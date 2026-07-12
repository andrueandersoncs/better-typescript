import { Predicate, Schema } from "effect"
import type * as ts from "typescript"

const isTsProgram = (input: unknown): input is ts.Program =>
  Predicate.hasProperty(input, "getTypeChecker")

const isTsTypeChecker = (input: unknown): input is ts.TypeChecker =>
  Predicate.hasProperty(input, "getTypeAtLocation")

const isTsSourceFile = (input: unknown): input is ts.SourceFile =>
  Predicate.hasProperty(input, "languageVersion")

export const TsProgram = Schema.declare(isTsProgram).annotations({
  identifier: "ts.Program"
})

export const TsTypeChecker = Schema.declare(isTsTypeChecker).annotations({
  identifier: "ts.TypeChecker"
})

export const TsSourceFile = Schema.declare(isTsSourceFile).annotations({
  identifier: "ts.SourceFile"
})

const isTsNode = (input: unknown): input is ts.Node =>
  Predicate.hasProperty(input, "kind")

export const TsNode = Schema.declare(isTsNode).annotations({
  identifier: "ts.Node"
})
