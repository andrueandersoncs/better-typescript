import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import type { Rule, RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-function-keyword"

type FunctionKeywordNode = ts.FunctionDeclaration | ts.FunctionExpression
type FunctionDeclarationWithBody = ts.FunctionDeclaration & {
  readonly body: NonNullable<ts.FunctionDeclaration["body"]>
}

const isFunctionKeywordNode = (node: ts.Node): node is FunctionKeywordNode =>
  ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)

const isGeneratorFunction = (node: FunctionKeywordNode): boolean =>
  Option.isSome(Option.fromNullable(node.asteriskToken))

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
    const symbol = yield* Option.fromNullable(context.checker.getSymbolAtLocation(name))
    const declarations = yield* Option.fromNullable(symbol.declarations)

    return declarations.filter(ts.isFunctionDeclaration)
  })

const isOverloadOf =
  (implementation: FunctionDeclarationWithBody) =>
  (candidate: ts.FunctionDeclaration): boolean => {
    const isImplementation = candidate === implementation
    const hasNoBody = Option.isNone(Option.fromNullable(candidate.body))

    return [!isImplementation, hasNoBody].every(Boolean)
  }

const hasOverloadFor =
  (implementation: FunctionDeclarationWithBody) =>
  (declarations: ReadonlyArray<ts.FunctionDeclaration>): boolean =>
    declarations.some(isOverloadOf(implementation))

const hasOverloadSignature = (
  context: RuleContext,
  implementation: FunctionDeclarationWithBody
): boolean =>
  Option.exists(overloadDeclarations(context, implementation), hasOverloadFor(implementation))

const lacksOverloadSignature =
  (context: RuleContext) =>
  (declaration: FunctionDeclarationWithBody): boolean =>
    !hasOverloadSignature(context, declaration)

const isDisallowedFunctionDeclaration = (
  context: RuleContext,
  node: FunctionKeywordNode
): boolean => Option.exists(functionDeclarationWithBody(node), lacksOverloadSignature(context))

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
): ReadonlyArray<RuleMatch> =>
  isDisallowedFunctionKeyword(context, node)
    ? [
        createRuleMatch(context, {
          ruleId,
          node: functionKeywordToken(context.sourceFile, node),
          message: "Avoid using the function keyword.",
          hint:
            "Declare this function as a const using fat-arrow syntax instead. Keep function " +
            "declarations only when overload signatures are required, and keep function* when " +
            "generator semantics are required."
        })
      ]
    : []

export const noFunctionKeyword: Rule = {
  id: ruleId,
  description: "Disallow non-generator function declarations in favor of const arrow functions.",
  check: onNode(
    [ts.SyntaxKind.FunctionDeclaration, ts.SyntaxKind.FunctionExpression],
    isFunctionKeywordNode,
    functionKeywordMatches
  )
}
