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

const isTsIdentifier = (input: unknown): input is ts.Identifier =>
  Predicate.hasProperty(input, "kind") && Predicate.hasProperty(input, "text")

export const TsIdentifier = Schema.declare(isTsIdentifier).annotations({
  identifier: "ts.Identifier"
})

const isTsSymbol = (input: unknown): input is ts.Symbol =>
  Predicate.hasProperty(input, "flags") && Predicate.hasProperty(input, "name")

export const TsSymbol = Schema.declare(isTsSymbol).annotations({
  identifier: "ts.Symbol"
})

const isFunctionDeclarationNode = (
  input: unknown
): input is ts.VariableDeclaration | ts.FunctionDeclaration =>
  Predicate.hasProperty(input, "kind") && Predicate.hasProperty(input, "name")

export const TsFunctionDeclarationNode = Schema.declare(
  isFunctionDeclarationNode
).annotations({
  identifier: "ts.VariableDeclaration | ts.FunctionDeclaration"
})
