import { Array, pipe, Option } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import {
  isReturnTypeDeclaration,
  namedDetectionTarget,
  returnTypeNode
} from "./support/tsNode.js"
import type { ReturnTypeDeclaration } from "./support/tsNode.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import { fixtureRefactorExamples } from "../fixtureExamples.js"

const containsRawObjectType = (typeNode: ts.TypeNode): boolean => {
  const isTypeLiteral = ts.isTypeLiteralNode(typeNode)
  const isObjectKeyword = typeNode.kind === ts.SyntaxKind.ObjectKeyword
  const isUnionType = ts.isUnionTypeNode(typeNode)

  const unionContainsRaw =
    isUnionType && Array.some(typeNode.types, containsRawObjectType)

  const isIntersectionType = ts.isIntersectionTypeNode(typeNode)

  const intersectionContainsRaw =
    isIntersectionType && Array.some(typeNode.types, containsRawObjectType)

  const isParenthesizedType = ts.isParenthesizedTypeNode(typeNode)

  const parenthesizedContainsRaw =
    isParenthesizedType && containsRawObjectType(typeNode.type)

  const conditions = Array.make(
    isTypeLiteral,
    isObjectKeyword,
    unionContainsRaw,
    intersectionContainsRaw,
    parenthesizedContainsRaw
  )

  return Array.some(conditions, Boolean)
}

const parameterTypeNode = (
  param: ts.ParameterDeclaration
): Option.Option<ts.TypeNode> => Option.fromNullable(param.type)

type RawObjectTarget = ts.ParameterDeclaration | ReturnTypeDeclaration

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

const rawObjectTypeMatches = (context: CheckContext) => {
  const match = detection(context)

  const matches = (node: RawObjectTarget): ReadonlyArray<Detection> => {
    if (ts.isParameter(node)) {
      const reported = match({
        node,
        message:
          "Parameter uses an anonymous object type instead of a named type.",
        hint:
          "Define a named type or interface that describes the data's domain meaning — " +
          "for example ConnectionConfig instead of { host: string, port: number }. " +
          "Name the type after what the data represents, not its structural role " +
          "(avoid names like FooParameters or BarOptions)."
      })

      return Array.of(reported)
    }

    const reportNode = namedDetectionTarget(node)

    const reported2 = match({
      node: reportNode,
      message:
        "Return type uses an anonymous object type instead of a named type.",
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

const check =
  nodeCheck(rawObjectTargetKinds)(isRawObjectTarget)(rawObjectTypeMatches)

export const noRawObjectTypes: Check = check

export const noRawObjectTypesExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-raw-object-types")
