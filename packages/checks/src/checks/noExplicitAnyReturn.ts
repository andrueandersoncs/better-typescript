import { Array, pipe, Option } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { isReturnTypeDeclaration, returnTypeNode } from "./support/tsNode.js"
import type { ReturnTypeDeclaration } from "./support/tsNode.js"
import { detection } from "@better-typescript/core/engine/location"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Check } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location/data"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example/data"

import {
  fixtureRefactorExamples
} from "../fixtureExamples.js"
const returnTypeDeclarationKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.MethodSignature,
  ts.SyntaxKind.CallSignature,
  ts.SyntaxKind.FunctionType,
  ts.SyntaxKind.GetAccessor
]

const containsAnyKeyword = (node: ts.Node): boolean => {
  const isAnyKeyword = node.kind === ts.SyntaxKind.AnyKeyword
  const anyChild = ts.forEachChild(node, (child) =>
    containsAnyKeyword(child) ? child : void 0
  )
  const hasAnyDescendant = pipe(Option.fromNullable(anyChild), Option.isSome)

  return Array.some([isAnyKeyword, hasAnyDescendant], Boolean)
}

const explicitAnyReturnElements = (context: CheckContext) => {
  const element = detection(context)

  const matches = (node: ReturnTypeDeclaration): ReadonlyArray<Detection> => {
    const hasAnyReturnType = pipe(
      returnTypeNode(node),
      Option.exists(containsAnyKeyword)
    )

    return hasAnyReturnType
      ? [
          element({
            node,
            message: "Avoid function return types that include any.",
            hint:
              "Declare a precise return type instead of any. If the value is unknown at a boundary, " +
              "use unknown and narrow before use."
          })
        ]
      : []
  }

  return matches
}

export const noExplicitAnyReturn: Check = nodeCheck(returnTypeDeclarationKinds)(
  isReturnTypeDeclaration
)(explicitAnyReturnElements)

export const noExplicitAnyReturnExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-explicit-any-return")
