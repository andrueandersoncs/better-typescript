import { parameterTypeNode } from "../../internal/support/parameterTypeNode.js"
import { Array, Function, Option, Schema, Struct, pipe } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../../internal/scanner/makeNodeMatch.js"
import type { Match } from "../../internal/scanner/match.js"
import { isReturnTypeDeclaration } from "../../internal/support/isReturnTypeDeclaration.js"
import { namedCandidateTarget } from "../../internal/support/namedCandidateTarget.js"
import type { ReturnTypeDeclaration } from "../../internal/support/returnTypeDeclaration.js"
import { strictEqual } from "../../internal/equivalence.js"
import type { RawObjectTarget } from "./rawObjectTarget.js"

const rawObjectKinds = Array.make<["parameter", "return"]>("parameter", "return")
const rawObjectKindSchema = Schema.Literals(rawObjectKinds)

// NoRawObjectTypesFact classifies the raw object site because remediation differs by position.
export const NoRawObjectTypesFact = Schema.Struct({
  kind: rawObjectKindSchema
})

export interface NoRawObjectTypesFact extends Schema.Schema.Type<typeof NoRawObjectTypesFact> {}

const containsRawObjectType = (typeNode: ts.TypeNode): boolean => {
  const isTypeLiteral = ts.isTypeLiteralNode(typeNode)
  const isObjectKeyword = strictEqual(ts.SyntaxKind.ObjectKeyword)(typeNode.kind)
  const isUnionType = ts.isUnionTypeNode(typeNode)
  const unionContainsRaw = isUnionType && Array.some(typeNode.types, containsRawObjectType)
  const isIntersectionType = ts.isIntersectionTypeNode(typeNode)

  const intersectionContainsRaw =
    isIntersectionType && Array.some(typeNode.types, containsRawObjectType)

  const isParenthesizedType = ts.isParenthesizedTypeNode(typeNode)
  const parenthesizedContainsRaw = isParenthesizedType && containsRawObjectType(typeNode.type)

  const conditions = Array.make(
    isTypeLiteral,
    isObjectKeyword,
    unionContainsRaw,
    intersectionContainsRaw,
    parenthesizedContainsRaw
  )

  return Array.some(conditions, Boolean)
}

const returnTypeNode = Function.flow(
  Struct.get<ReturnTypeDeclaration, "type">("type"),
  Option.fromNullishOr
)

const isRawObjectTarget = (node: ts.Node): node is RawObjectTarget =>
  pipe(
    Option.liftPredicate(ts.isParameter)(node),
    Option.flatMap(parameterTypeNode),
    Option.exists(containsRawObjectType)
  ) ||
  pipe(
    Option.liftPredicate(isReturnTypeDeclaration)(node),
    Option.flatMap(returnTypeNode),
    Option.exists(containsRawObjectType)
  )

const rawObjectTargetKinds: ReadonlyArray<ts.SyntaxKind> = Array.make(
  ts.SyntaxKind.Parameter,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.MethodSignature,
  ts.SyntaxKind.CallSignature,
  ts.SyntaxKind.FunctionType,
  ts.SyntaxKind.GetAccessor
)

const matchRawObjectType = (node: RawObjectTarget): ReadonlyArray<Match<NoRawObjectTypesFact>> => {
  if (ts.isParameter(node)) {
    const parameterFact = NoRawObjectTypesFact.make({ kind: "parameter" })
    const parameterMatch = makeNodeMatch(node, parameterFact)

    return Array.of(parameterMatch)
  }

  const reportNode = namedCandidateTarget(node)
  const returnFact = NoRawObjectTypesFact.make({ kind: "return" })
  const returnMatch = makeNodeMatch(reportNode, returnFact)

  return Array.of(returnMatch)
}

const noRawObjectTypesMatches = Function.constant(matchRawObjectType)

export const noRawObjectTypesScanner =
  makeNodeScanner(rawObjectTargetKinds)(isRawObjectTarget)(noRawObjectTypesMatches)
