import { Array, Function, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../../internal/equivalence.js"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import { isReturnTypeDeclaration } from "../../internal/support/isReturnTypeDeclaration.js"
import type { ReturnTypeDeclaration } from "../../internal/support/returnTypeDeclaration.js"
import { returnTypeDeclarationKinds } from "../../internal/support/returnTypeDeclarationKinds.js"

// NoExplicitAnyReturnFact exists because its fields form one stable data contract used by the linter.
export const NoExplicitAnyReturnFact = Schema.Struct({})

export interface NoExplicitAnyReturnFact extends Schema.Schema.Type<
  typeof NoExplicitAnyReturnFact
> {}

// emptyNoExplicitAnyReturnFact exists because its fields form one stable data contract used by the linter.
export const emptyNoExplicitAnyReturnFact = NoExplicitAnyReturnFact.make({})

const containsAnyKeyword = (node: ts.Node): boolean => {
  const anyKeywordChild = (child: ts.Node) => (containsAnyKeyword(child) ? child : void 0)
  const isAnyKeyword = strictEqual(ts.SyntaxKind.AnyKeyword)(node.kind)
  const anyChild = ts.forEachChild(node, anyKeywordChild)
  const hasAnyDescendant = pipe(Option.fromNullishOr(anyChild), Option.isSome)
  const ambientConditions = Array.make(isAnyKeyword, hasAnyDescendant)
  return Array.some(ambientConditions, Boolean)
}

const hasAnyReturnType = (decl: ReturnTypeDeclaration) => {
  const returnType = Option.fromNullishOr(decl.type)

  return Option.exists(returnType, containsAnyKeyword)
}

const matchExplicitAnyReturnNode = (node: ReturnTypeDeclaration) => {
  if (!hasAnyReturnType(node)) {
    return Array.empty()
  }

  const match = makeNodeMatch(node, emptyNoExplicitAnyReturnFact)

  return Array.of(match)
}

const noExplicitAnyReturnMatches = Function.constant(matchExplicitAnyReturnNode)

export const noExplicitAnyReturnScanner = makeNodeScanner(returnTypeDeclarationKinds)(
  isReturnTypeDeclaration
)(noExplicitAnyReturnMatches)
