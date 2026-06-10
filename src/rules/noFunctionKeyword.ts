import { Chunk, Effect, Option, Stream } from "effect"
import * as ts from "typescript"
import { createRuleMatch } from "./ruleMatch.js"
import { nodeStream } from "./traverse.js"
import type { Rule, RuleContext } from "./types.js"

const ruleId = "no-function-keyword"

type FunctionKeywordNode = ts.FunctionDeclaration | ts.FunctionExpression
type FunctionDeclarationWithBody = ts.FunctionDeclaration & {
  readonly body: NonNullable<ts.FunctionDeclaration["body"]>
}

export const noFunctionKeyword: Rule = {
  id: ruleId,
  description: "Disallow non-generator function declarations in favor of const arrow functions.",
  check: (context) =>
    Effect.runSync(
      nodeStream(context.sourceFile).pipe(
        Stream.filter(isFunctionKeywordNode),
        Stream.filter((node) => isDisallowedFunctionKeyword(context, node)),
        Stream.map((node) =>
          createRuleMatch(context, {
            ruleId,
            node: functionKeywordToken(context.sourceFile, node),
            message: "Avoid using the function keyword.",
            hint:
              "Declare this function as a const using fat-arrow syntax instead. Keep function " +
              "declarations only when overload signatures are required, and keep function* when " +
              "generator semantics are required."
          })
        ),
        Stream.runCollect,
        Effect.map((matches) => Chunk.toReadonlyArray(matches))
      )
    )
}

const isFunctionKeywordNode = (node: ts.Node): node is FunctionKeywordNode =>
  ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)

const isDisallowedFunctionKeyword = (
  context: RuleContext,
  node: FunctionKeywordNode
): boolean => {
  const isNotGenerator = !isGeneratorFunction(node)
  const isDisallowedKind =
    ts.isFunctionExpression(node) || isDisallowedFunctionDeclaration(context, node)

  return isNotGenerator && isDisallowedKind
}

const isDisallowedFunctionDeclaration = (
  context: RuleContext,
  node: FunctionKeywordNode
): boolean => {
  const declaration = functionDeclarationWithBody(node)

  return Option.match(declaration, {
    onNone: () => false,
    onSome: (declaration) => !hasOverloadSignature(context, declaration)
  })
}

const isGeneratorFunction = (node: FunctionKeywordNode): boolean =>
  Option.isSome(Option.fromNullable(node.asteriskToken))

const functionDeclarationWithBody = (
  node: FunctionKeywordNode
): Option.Option<FunctionDeclarationWithBody> => {
  if (!ts.isFunctionDeclaration(node)) {
    return Option.none()
  }

  return Option.match(Option.fromNullable(node.body), {
    onNone: () => Option.none(),
    onSome: () => Option.some(node as FunctionDeclarationWithBody)
  })
}

const hasOverloadSignature = (
  context: RuleContext,
  declaration: FunctionDeclarationWithBody
): boolean => {
  const symbol = symbolFromDeclarationName(context, Option.fromNullable(declaration.name))
  const declarations = Option.match(symbol, {
    onNone: () => [],
    onSome: (symbol) =>
      Option.match(Option.fromNullable(symbol.declarations), {
        onNone: () => [],
        onSome: (declarations) => declarations.filter(ts.isFunctionDeclaration)
      })
  })

  return declarations.some((candidate) => isOverloadCandidate(candidate, declaration))
}

const symbolFromDeclarationName = (
  context: RuleContext,
  name: Option.Option<ts.Identifier>
): Option.Option<ts.Symbol> =>
  Option.match(name, {
    onNone: () => Option.none(),
    onSome: (name) => Option.fromNullable(context.checker.getSymbolAtLocation(name))
  })

const isOverloadCandidate = (
  candidate: ts.FunctionDeclaration,
  implementation: FunctionDeclarationWithBody
): boolean => {
  const isImplementation = candidate === implementation
  const hasNoBody = Option.isNone(Option.fromNullable(candidate.body))

  return [!isImplementation, hasNoBody].every(Boolean)
}

const functionKeywordToken = (sourceFile: ts.SourceFile, node: FunctionKeywordNode): ts.Node =>
  node
    .getChildren(sourceFile)
    .find((child) => child.kind === ts.SyntaxKind.FunctionKeyword) ?? node
