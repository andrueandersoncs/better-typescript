import { Array, Function, Option, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import { NodeTarget, RuleFinding } from "@better-typescript/core/linter"
import type { Rule, RuleContext } from "@better-typescript/core/linter"
import { astNodesIn } from "../sources/astNodesIn.js"
import { strictEqual } from "../equivalence.js"
import type { FunctionKeywordNode } from "../builtins/functionKeywordNode.js"

const message =
  "Avoid using the function keyword. Declare this function as a const using fat-arrow syntax instead. " +
  "Keep function declarations only when overload signatures are required, and keep function* when " +
  "generator semantics are required."

const isFunctionKeywordNode = (node: ts.Node): node is FunctionKeywordNode =>
  ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)

const isFunctionKeywordToken = flow(
  Struct.get<ts.Node, "kind">("kind"),
  strictEqual(ts.SyntaxKind.FunctionKeyword)
)

const hasOverloadSibling = (context: RuleContext) => (declaration: ts.FunctionDeclaration) => {
  const declarations = Option.gen(function* () {
    const name = yield* Option.fromNullishOr(declaration.name)
    const symbolAtName = context.checker.getSymbolAtLocation(name)
    const symbol = yield* Option.fromNullishOr(symbolAtName)
    const symbolDeclarations = yield* Option.fromNullishOr(symbol.declarations)

    return Array.filter(symbolDeclarations, ts.isFunctionDeclaration)
  })

  const isOverloadSibling = (candidate: ts.FunctionDeclaration) => {
    const sameDeclaration = strictEqual(declaration)(candidate)
    const differentDeclaration = !sameDeclaration
    const candidateBody = Option.fromNullishOr(candidate.body)
    const hasNoBody = Option.isNone(candidateBody)

    return differentDeclaration && hasNoBody
  }

  return Option.exists(declarations, Array.some(isOverloadSibling))
}

const isUnsanctionedFunction =
  (isOverloaded: (node: ts.FunctionDeclaration) => boolean) => (node: FunctionKeywordNode) => {
    const asteriskToken = Option.fromNullishOr(node.asteriskToken)
    const isGenerator = Option.isSome(asteriskToken)
    const isDeclaration = ts.isFunctionDeclaration(node)
    const isOverloadedDeclaration = isDeclaration && isOverloaded(node)
    const isNotGenerator = !isGenerator
    const isNotOverloadedDeclaration = !isOverloadedDeclaration

    return isNotGenerator && isNotOverloadedDeclaration
  }

const makeFunctionKeywordFinding =
  (context: RuleContext) =>
  (node: FunctionKeywordNode): RuleFinding => {
    const children = node.getChildren(context.sourceFile)

    const keyword = pipe(
      children,
      Array.findFirst(isFunctionKeywordToken),
      Option.getOrElse(Function.constant(node))
    )

    const target = NodeTarget.make({ node: keyword })

    return RuleFinding.make({ message, target })
  }

const checkNoFunctionKeyword = (context: RuleContext) => {
  const isOverloaded = hasOverloadSibling(context)

  return pipe(
    astNodesIn(context.sourceFile),
    Array.fromIterable,
    Array.filter(isFunctionKeywordNode),
    Array.filter(isUnsanctionedFunction(isOverloaded)),
    Array.map(makeFunctionKeywordFinding(context))
  )
}

export const noFunctionKeyword: Rule = {
  name: "no-function-keyword",
  check: checkNoFunctionKeyword
}
