import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-async-functions"

type AsyncCapableFunction =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration

const asyncCapableFunctionKinds: ReadonlyArray<ts.SyntaxKind> = [
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration
]

const isAsyncCapableFunction = (node: ts.Node): node is AsyncCapableFunction =>
  [
    ts.isFunctionDeclaration(node),
    ts.isFunctionExpression(node),
    ts.isArrowFunction(node),
    ts.isMethodDeclaration(node)
  ].some(Boolean)

const isAsyncModifier = (modifier: ts.ModifierLike): boolean =>
  modifier.kind === ts.SyntaxKind.AsyncKeyword

const findAsyncModifier = (
  modifiers: ReadonlyArray<ts.ModifierLike>
): Option.Option<ts.ModifierLike> => {
  const modifier = modifiers.find(isAsyncModifier)

  return Option.fromNullable(modifier)
}

const asyncModifier = (node: AsyncCapableFunction): Option.Option<ts.ModifierLike> => {
  const modifiers = ts.getModifiers(node)

  return Option.fromNullable(modifiers).pipe(Option.flatMap(findAsyncModifier))
}

const asyncFunctionMatch =
  (context: RuleContext) =>
  (keyword: ts.ModifierLike): RuleMatch =>
    createRuleMatch(context, {
      ruleId,
      node: keyword,
      message: "Avoid declaring functions as async.",
      hint:
        "Model asynchronous work with Effect instead of async/await. Return an Effect from the " +
        "function — use Effect.gen with yield* in place of an async body, or wrap a Promise with " +
        "Effect.promise / Effect.tryPromise — so the asynchronous work is described, not run."
    })

const asyncFunctionMatches = (
  node: AsyncCapableFunction,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  asyncModifier(node).pipe(Option.map(asyncFunctionMatch(context)), Option.toArray)

const check = onNode(asyncCapableFunctionKinds, isAsyncCapableFunction, asyncFunctionMatches)

export const noAsyncFunctions = new Rule({
  id: ruleId,
  description: "Disallow async functions in favor of Effect-returning functions.",
  check
})
