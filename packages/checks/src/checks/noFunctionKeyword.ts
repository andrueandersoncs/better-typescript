import { Array, Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "@better-typescript/core/engine/check"
import { detection } from "@better-typescript/core/engine/location"
import type { Check, CheckContext } from "@better-typescript/core/engine/check"
import type { Detection } from "@better-typescript/core/engine/location"
import type { NonEmptyRefactorExamples } from "@better-typescript/core/engine/example"

import {
  fixtureRefactorExamples
} from "../fixtureExamples.js"
type FunctionKeywordNode = ts.FunctionDeclaration | ts.FunctionExpression

const isFunctionKeywordNode = (node: ts.Node): node is FunctionKeywordNode =>
  ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)

const isFunctionKeywordToken = (child: ts.Node): boolean =>
  child.kind === ts.SyntaxKind.FunctionKeyword

const functionKeywordMatches = (context: CheckContext) => {
  const sourceFile = context.sourceFile
  const checker = context.checker
  const match = detection(context)

  const matches = (node: FunctionKeywordNode): ReadonlyArray<Detection> => {
    const asteriskToken = Option.fromNullable(node.asteriskToken)
    const isNotGenerator = !Option.isSome(asteriskToken)
    const declarationWithBody = ts.isFunctionDeclaration(node)
      ? pipe(Option.fromNullable(node.body), Option.as(node))
      : Option.none()
    const isDisallowedKind =
      ts.isFunctionExpression(node) ||
      Option.exists(declarationWithBody, (declaration) => {
        const declarations = Option.gen(function* () {
          const name = yield* Option.fromNullable(declaration.name)
          const nameSymbol = checker.getSymbolAtLocation(name)
          const symbol = yield* Option.fromNullable(nameSymbol)
          const decls = yield* Option.fromNullable(symbol.declarations)

          return decls.filter(ts.isFunctionDeclaration)
        })

        return !Option.exists(declarations, (decls) =>
          Array.some(decls, (candidate) => {
            const isImplementation = candidate === declaration
            const body = Option.fromNullable(candidate.body)
            const hasNoBody = Option.isNone(body)

            return [!isImplementation, hasNoBody].every(Boolean)
          })
        )
      })

    const shouldFlag = isNotGenerator && isDisallowedKind

    if (!shouldFlag) {
      return []
    }

    const keywordToken =
      node.getChildren(sourceFile).find(isFunctionKeywordToken) ?? node

    return [
      match({
        node: keywordToken,
        message: "Avoid using the function keyword.",
        hint:
          "Declare this function as a const using fat-arrow syntax instead. Keep function " +
          "declarations only when overload signatures are required, and keep function* when " +
          "generator semantics are required."
      })
    ]
  }

  return matches
}

const check = nodeCheck([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression
])(isFunctionKeywordNode)(functionKeywordMatches)

export const noFunctionKeyword: Check = check

export const noFunctionKeywordExamples: NonEmptyRefactorExamples =
  fixtureRefactorExamples("no-function-keyword")
