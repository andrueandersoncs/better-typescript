import { Array, pipe, Option } from "effect"
import * as ts from "typescript"
import { isReturnTypeDeclaration, namedDetectionTarget } from "./support/tsNode.js"
import type { ReturnTypeDeclaration } from "./support/tsNode.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"
import { nodeCheck, detection } from "@better-typescript/core/engine/check"

const containsRawObjectType = (typeNode: ts.TypeNode): boolean => {
  const isTypeLiteral = ts.isTypeLiteralNode(typeNode)
  const isObjectKeyword = typeNode.kind === ts.SyntaxKind.ObjectKeyword
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

const parameterTypeNode = (param: ts.ParameterDeclaration): Option.Option<ts.TypeNode> =>
  Option.fromNullable(param.type)

/**
 * RawObjectTarget is the syntax contract shared by raw-object candidate
 * detection and matching.
 *
 * @remarks
 *   It remains explicit because both owners need one stable compiler-node
 *   vocabulary; removing it would duplicate the union and let their accepted
 *   declarations drift.
 * @modelRole shared
 */
export type RawObjectTarget = ts.ParameterDeclaration | ReturnTypeDeclaration

const isRawObjectTarget = (node: ts.Node): node is RawObjectTarget =>
  pipe(
    Option.liftPredicate(ts.isParameter)(node),
    Option.flatMap(parameterTypeNode),
    Option.exists(containsRawObjectType)
  ) ||
  pipe(
    Option.liftPredicate(isReturnTypeDeclaration)(node),
    Option.flatMap((decl) => Option.fromNullable(decl.type)),
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

const rawObjectTypeMatches = (context: CheckContext) => {
  const match = detection(context)

  const matches = (node: RawObjectTarget): ReadonlyArray<Detection> => {
    if (ts.isParameter(node)) {
      const reported = match({
        node,
        message: "Parameter uses an anonymous object type instead of a named type.",
        hint:
          "Reuse a named data structure that already expresses this value's semantics. " +
          "If none exists, reconsider whether this function is a real abstraction or a " +
          "procedural seam that should be collapsed into its owner. Introduce a new model " +
          "only when the data has meaning independent of this parameter list; never replace " +
          "it with another anonymous object type."
      })

      return Array.of(reported)
    }

    const reportNode = namedDetectionTarget(node)

    const reported2 = match({
      node: reportNode,
      message: "Return type uses an anonymous object type instead of a named type.",
      hint:
        "Define a named type or interface that describes the data's domain meaning — " +
        "for example UserProfile instead of { name: string, age: number }. " +
        "Name the type after what the data represents, not its structural role " +
        "(avoid names like FooResult or BarResponse)."
    })

    return Array.of(reported2)
  }

  return matches
}

const check = nodeCheck(rawObjectTargetKinds)(isRawObjectTarget)(rawObjectTypeMatches)

export const noRawObjectTypes: Check = check

export const noRawObjectTypesExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-raw-object-types")
