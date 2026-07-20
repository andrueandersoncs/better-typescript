import { Array, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { makeCheck } from "../defineCheck.js"
import { makeDetection } from "@better-typescript/core/engine/check"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

// FunctionKeywordNode is shared keyword syntax because owners need one node vocabulary.
export type FunctionKeywordNode = ts.FunctionDeclaration | ts.FunctionExpression

const isFunctionKeywordNode = (node: ts.Node): node is FunctionKeywordNode =>
  ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)

const isFunctionKeywordToken = (child: ts.Node) =>
  strictEqual(child.kind, ts.SyntaxKind.FunctionKeyword)

const functionKeywordMatches = (context: CheckContext) => {
  const sourceFile = context.sourceFile
  const checker = context.checker
  const match = makeDetection(context)

  const matches = (node: FunctionKeywordNode): ReadonlyArray<Detection> => {
    const asteriskToken = Option.fromNullishOr(node.asteriskToken)
    const isNotGenerator = !Option.isSome(asteriskToken)

    const declarationWithBody = ts.isFunctionDeclaration(node)
      ? pipe(Option.fromNullishOr(node.body), Option.as(node))
      : Option.none()

    const isDisallowedKind =
      ts.isFunctionExpression(node) ||
      Option.exists(declarationWithBody, (declaration) => {
        const declarations = Option.gen(function* () {
          const name = yield* Option.fromNullishOr(declaration.name)
          const nameSymbol = checker.getSymbolAtLocation(name)
          const symbol = yield* Option.fromNullishOr(nameSymbol)
          const decls = yield* Option.fromNullishOr(symbol.declarations)

          return Array.filter(decls, ts.isFunctionDeclaration)
        })

        const isOverloadSibling = (candidate: ts.FunctionDeclaration) => {
          const isImplementation = strictEqual(candidate, declaration)
          const body = Option.fromNullishOr(candidate.body)
          const hasNoBody = Option.isNone(body)
          const overloadSiblingConditions = Array.make(!isImplementation, hasNoBody)

          return Array.every(overloadSiblingConditions, Boolean)
        }

        const hasOverloadSibling = (decls: ReadonlyArray<ts.FunctionDeclaration>) =>
          Array.some(decls, isOverloadSibling)

        return !Option.exists(declarations, hasOverloadSibling)
      })

    const shouldFlag = isNotGenerator && isDisallowedKind

    if (!shouldFlag) {
      return Array.empty()
    }

    const children = node.getChildren(sourceFile)

    const keywordToken = pipe(
      Array.findFirst(children, isFunctionKeywordToken),
      Option.getOrElse(Function.constant(node))
    )

    const functionKeywordMatch = match({
      node: keywordToken,
      message: "Avoid using the function keyword.",
      hint:
        "Declare this function as a const using fat-arrow syntax instead. Keep function " +
        "declarations only when overload signatures are required, and keep function* when " +
        "generator semantics are required."
    })

    return Array.of(functionKeywordMatch)
  }

  return matches
}

const functionKeywordNodeKinds = Array.make(
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression
)

export const noFunctionKeyword = makeCheck(
  "no-function-keyword",
  functionKeywordNodeKinds,
  isFunctionKeywordNode,
  functionKeywordMatches
)
