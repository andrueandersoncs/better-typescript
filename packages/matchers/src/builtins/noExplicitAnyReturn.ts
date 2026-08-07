import { Array, Function, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { strictEqual } from "../equivalence.js"
import { nodeMatcher } from "../matcher/nodeMatcher.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import { isReturnTypeDeclaration } from "../support/isReturnTypeDeclaration.js"
import type { ReturnTypeDeclaration } from "../support/returnTypeDeclaration.js"
import { returnTypeDeclarationKinds } from "../support/returnTypeDeclarationKinds.js"

// NoExplicitAnyReturnFact is empty payload because guidance and matchers share identity.
export const NoExplicitAnyReturnFact = Schema.Struct({})

export interface NoExplicitAnyReturnFact extends Schema.Schema.Type<
  typeof NoExplicitAnyReturnFact
> {}

// emptyNoExplicitAnyReturnFact is empty payload because guidance and matchers share identity.
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

export const noExplicitAnyReturnMatcher = nodeMatcher(returnTypeDeclarationKinds)(
  isReturnTypeDeclaration
)(noExplicitAnyReturnMatches)
