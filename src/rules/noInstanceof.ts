import { Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import type { CreateMatch } from "./ruleMatch.js"
import { isFirstPartySymbol } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-instanceof"

const isInstanceofOperator = (expr: ts.BinaryExpression): boolean =>
  expr.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword

const isInstanceofExpression = (node: ts.Node): node is ts.BinaryExpression =>
  pipe(
    Option.liftPredicate(ts.isBinaryExpression)(node),
    Option.exists(isInstanceofOperator)
  )

const className: (symbol: ts.Symbol) => string = Struct.get("name")

const instanceofRuleMatch =
  (match: CreateMatch) =>
  (expression: ts.BinaryExpression) =>
  (symbol: ts.Symbol): RuleMatch => {
    const name = className(symbol)

    return match({
      ruleId,
      node: expression,
      message: `Avoid instanceof for the first-party class "${name}".`,
      hint:
        `Use Schema.is(${name})(value) or a Schema-based type guard instead of instanceof. ` +
        "Schema.is is structural, works across realms, and stays consistent with " +
        "the Effect type system."
    })
  }

// The context stage runs once per file, so every partial below is shared by all instanceof expressions the dispatcher feeds to matches.
const instanceofMatches = (context: RuleContext) => {
  const checker = context.checker
  const ruleMatch = instanceofRuleMatch(createRuleMatch(context))

  const matches = (
    expression: ts.BinaryExpression
  ): ReadonlyArray<RuleMatch> => {
    const symbolAtLocation = checker.getSymbolAtLocation(expression.right)
    const symbol = Option.fromNullable(symbolAtLocation)

    return pipe(
      symbol,
      Option.filter(isFirstPartySymbol),
      Option.map(ruleMatch(expression)),
      Option.toArray
    )
  }

  return matches
}

const check = onNode([ts.SyntaxKind.BinaryExpression])(isInstanceofExpression)(
  instanceofMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/check.ts",
  code: `import { Schema } from "effect"

class NotFoundError extends Schema.TaggedError<NotFoundError>("NotFoundError")("NotFoundError", {}) {}

export const recover =
  (fallback: string) =>
  (error: unknown) => {
    if (error instanceof NotFoundError) {
      return fallback
    }
  }`
})

const goodExample = new ExampleSnippet({
  filePath: "src/check.ts",
  code: `import { Schema } from "effect"

class NotFoundError extends Schema.TaggedError<NotFoundError>("NotFoundError")("NotFoundError", {}) {}

export const recover =
  (fallback: string) =>
  (error: unknown) => {
    if (Schema.is(NotFoundError)(error)) {
      return fallback
    }
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
