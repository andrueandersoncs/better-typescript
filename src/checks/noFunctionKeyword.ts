import { Option, pipe } from "effect"
import * as ts from "typescript"
import { nodeCheck } from "../engine/check.js"
import { detection } from "../engine/location.js"
import type { Check, CheckContext, Detection } from "../engine/check.js"

type FunctionKeywordNode = ts.FunctionDeclaration | ts.FunctionExpression
type FunctionDeclarationWithBody = ts.FunctionDeclaration & {
  readonly body: NonNullable<ts.FunctionDeclaration["body"]>
}

const isFunctionKeywordNode = (node: ts.Node): node is FunctionKeywordNode =>
  ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)

const isOverloadOf =
  (implementation: FunctionDeclarationWithBody) =>
  (candidate: ts.FunctionDeclaration): boolean => {
    const isImplementation = candidate === implementation
    const body = Option.fromNullable(candidate.body)
    const hasNoBody = Option.isNone(body)

    return [!isImplementation, hasNoBody].every(Boolean)
  }

const hasOverloadFor =
  (implementation: FunctionDeclarationWithBody) =>
  (declarations: ReadonlyArray<ts.FunctionDeclaration>): boolean =>
    declarations.some(isOverloadOf(implementation))

const lacksOverloadSignature =
  (checker: ts.TypeChecker) =>
  (declaration: FunctionDeclarationWithBody): boolean => {
    const declarations = Option.gen(function* () {
      const name = yield* Option.fromNullable(declaration.name)
      const nameSymbol = checker.getSymbolAtLocation(name)
      const symbol = yield* Option.fromNullable(nameSymbol)
      const decls = yield* Option.fromNullable(symbol.declarations)

      return decls.filter(ts.isFunctionDeclaration)
    })

    return !Option.exists(declarations, hasOverloadFor(declaration))
  }

const isFunctionKeywordToken = (child: ts.Node): boolean =>
  child.kind === ts.SyntaxKind.FunctionKeyword

// The context stage runs once per file, so every partial below is shared by all function-keyword nodes the report wiring feeds to matches.
const functionKeywordMatches = (context: CheckContext) => {
  const sourceFile = context.sourceFile
  const lacksOverloads = lacksOverloadSignature(context.checker)
  const match = detection(context)

  const matches = (node: FunctionKeywordNode): ReadonlyArray<Detection> => {
    const asteriskToken = Option.fromNullable(node.asteriskToken)
    const isNotGenerator = !Option.isSome(asteriskToken)
    const declarationWithBody = ts.isFunctionDeclaration(node)
      ? pipe(
          Option.fromNullable(node.body),
          Option.as(node as FunctionDeclarationWithBody)
        )
      : Option.none()
    const isDisallowedKind =
      ts.isFunctionExpression(node) ||
      Option.exists(declarationWithBody, lacksOverloads)

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
