import { Option, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-function-keyword"

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
  (context: RuleContext) =>
  (declaration: FunctionDeclarationWithBody): boolean => {
    const declarations = Option.gen(function* () {
      const name = yield* Option.fromNullable(declaration.name)
      const nameSymbol = context.checker.getSymbolAtLocation(name)
      const symbol = yield* Option.fromNullable(nameSymbol)
      const decls = yield* Option.fromNullable(symbol.declarations)

      return decls.filter(ts.isFunctionDeclaration)
    })

    return !Option.exists(declarations, hasOverloadFor(declaration))
  }

const isFunctionKeywordToken = (child: ts.Node): boolean =>
  child.kind === ts.SyntaxKind.FunctionKeyword

const functionKeywordMatches =
  (context: RuleContext) =>
  (node: FunctionKeywordNode): ReadonlyArray<RuleMatch> => {
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
      Option.exists(declarationWithBody, lacksOverloadSignature(context))

    const shouldFlag = isNotGenerator && isDisallowedKind

    if (!shouldFlag) {
      return []
    }

    const keywordToken =
      node.getChildren(context.sourceFile).find(isFunctionKeywordToken) ?? node

    return [
      createRuleMatch(context)({
        ruleId,
        node: keywordToken,
        message: "Avoid using the function keyword.",
        hint:
          "Declare this function as a const using fat-arrow syntax instead. Keep function " +
          "declarations only when overload signatures are required, and keep function* when " +
          "generator semantics are required."
      })
    ]
  }

const check = onNode([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression
])(isFunctionKeywordNode)(functionKeywordMatches)

const badExample = new ExampleSnippet({
  filePath: "src/math.ts",
  code: `function add(a: number, b: number): number {
  return a + b
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/math.ts",
  code: `const add =
  (a: number) =>
  (b: number): number =>
    a + b`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noFunctionKeyword = new Rule({
  id: ruleId,
  description:
    "Disallow non-generator function declarations in favor of const arrow functions.",
  example,
  check
})
