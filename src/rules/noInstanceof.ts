import { Option, Struct } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { isFirstPartySymbol } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-instanceof"

const isInstanceofOperator = (token: ts.BinaryOperatorToken): boolean =>
  token.kind === ts.SyntaxKind.InstanceOfKeyword

const isInstanceofExpression = (node: ts.Node): node is ts.BinaryExpression =>
  ts.isBinaryExpression(node) && isInstanceofOperator(node.operatorToken)

const instanceofClassSymbol = (
  checker: ts.TypeChecker,
  expression: ts.BinaryExpression
): Option.Option<ts.Symbol> => {
  const symbol = checker.getSymbolAtLocation(expression.right)

  return Option.fromNullable(symbol)
}

const className: (symbol: ts.Symbol) => string = Struct.get("name")

const instanceofRuleMatch =
  (context: RuleContext, expression: ts.BinaryExpression) =>
  (symbol: ts.Symbol): RuleMatch => {
    const name = className(symbol)

    return createRuleMatch(context, {
      ruleId,
      node: expression,
      message: `Avoid instanceof for the first-party class "${name}".`,
      hint:
        `Use Schema.is(${name})(value) or a Schema-based type guard instead of instanceof. ` +
        "Schema.is is structural, works across realms, and stays consistent with " +
        "the Effect type system."
    })
  }

const instanceofMatches = (
  expression: ts.BinaryExpression,
  context: RuleContext
): ReadonlyArray<RuleMatch> => {
  const symbol = instanceofClassSymbol(context.checker, expression)

  return symbol.pipe(
    Option.filter(isFirstPartySymbol),
    Option.map(instanceofRuleMatch(context, expression)),
    Option.toArray
  )
}

const check = onNode(
  [ts.SyntaxKind.BinaryExpression],
  isInstanceofExpression,
  instanceofMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/check.ts",
  code: `if (error instanceof NotFoundError) {
  return fallback
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/check.ts",
  code: `if (Schema.is(NotFoundError)(error)) {
  return fallback
}`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noInstanceof = new Rule({
  id: ruleId,
  description:
    "Disallow instanceof for first-party classes in favor of Schema.is type guards.",
  example,
  check
})
