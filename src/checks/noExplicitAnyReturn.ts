import { Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { isReturnTypeDeclaration, returnTypeNode } from "./support/tsNode.js"
import type { ReturnTypeDeclaration } from "./support/tsNode.js"
import { detection } from "../engine/location.js"
import type { Check, CheckContext } from "../engine/check.js"
import type { Detection } from "../engine/location.js"
import {
  fixtureRefactorExamples
} from "../engine/example.js"
import type { NonEmptyRefactorExamples } from "../engine/example.js"

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

  return [isAnyKeyword, hasAnyDescendant].some(Boolean)
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
