import { Option } from "effect"
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

const isGeneratorFunction = (node: FunctionKeywordNode): boolean => {
  const asteriskToken = Option.fromNullable(node.asteriskToken)

  return Option.isSome(asteriskToken)
}

const functionDeclarationWithBody = (
  node: FunctionKeywordNode
): Option.Option<FunctionDeclarationWithBody> =>
  ts.isFunctionDeclaration(node)
    ? Option.fromNullable(node.body).pipe(Option.as(node as FunctionDeclarationWithBody))
    : Option.none()

const overloadDeclarations = (
  context: RuleContext,
  implementation: FunctionDeclarationWithBody
): Option.Option<ReadonlyArray<ts.FunctionDeclaration>> =>
  Option.gen(function* () {
    const name = yield* Option.fromNullable(implementation.name)
    const nameSymbol = context.checker.getSymbolAtLocation(name)
    const symbol = yield* Option.fromNullable(nameSymbol)
    const declarations = yield* Option.fromNullable(symbol.declarations)

    return declarations.filter(ts.isFunctionDeclaration)
  })

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

const hasOverloadSignature = (
  context: RuleContext,
  implementation: FunctionDeclarationWithBody
): boolean => {
  const declarations = overloadDeclarations(context, implementation)

  return Option.exists(declarations, hasOverloadFor(implementation))
}

const lacksOverloadSignature =
  (context: RuleContext) =>
  (declaration: FunctionDeclarationWithBody): boolean =>
    !hasOverloadSignature(context, declaration)

const isDisallowedFunctionDeclaration = (
  context: RuleContext,
  node: FunctionKeywordNode
): boolean => {
  const declarationWithBody = functionDeclarationWithBody(node)

  return Option.exists(declarationWithBody, lacksOverloadSignature(context))
}

const isDisallowedFunctionKeyword = (
  context: RuleContext,
  node: FunctionKeywordNode
): boolean => {
  const isNotGenerator = !isGeneratorFunction(node)
  const isDisallowedKind =
    ts.isFunctionExpression(node) || isDisallowedFunctionDeclaration(context, node)

  return isNotGenerator && isDisallowedKind
}

const isFunctionKeywordToken = (child: ts.Node): boolean =>
  child.kind === ts.SyntaxKind.FunctionKeyword

const functionKeywordToken = (sourceFile: ts.SourceFile, node: FunctionKeywordNode): ts.Node =>
  node.getChildren(sourceFile).find(isFunctionKeywordToken) ?? node

const functionKeywordMatches = (
  node: FunctionKeywordNode,
  context: RuleContext
): ReadonlyArray<RuleMatch> => {
  if (!isDisallowedFunctionKeyword(context, node)) {
    return []
  }

  const keywordToken = functionKeywordToken(context.sourceFile, node)

  return [
    createRuleMatch(context, {
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

const check = onNode(
  [ts.SyntaxKind.FunctionDeclaration, ts.SyntaxKind.FunctionExpression],
  isFunctionKeywordNode,
  functionKeywordMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/math.ts",
  code: `function add(a: number, b: number): number {
  return a + b
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/math.ts",
  code: `const add = (a: number, b: number): number =>
  a + b`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noFunctionKeyword = new Rule({
  id: ruleId,
  description: "Disallow non-generator function declarations in favor of const arrow functions.",
  example,
  check
})
