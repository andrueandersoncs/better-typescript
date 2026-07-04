import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { unwrapExpression } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, Finding } from "./types.js"

const ruleId = "prefer-effect-record-filter-map"

const message = "Avoid conditional object spreads."

const hint =
  "Build a record of candidate properties and use Record.filterMap from Effect with " +
  "Option.some/Option.none (or Option.fromNullable) to keep only present entries."

const objectLiteralPropertyCount = (expression: ts.Expression): number => {
  const unwrapped = unwrapExpression(expression)

  return ts.isObjectLiteralExpression(unwrapped)
    ? unwrapped.properties.length
    : 0
}

const hasNoProperties = (expression: ts.Expression): boolean =>
  objectLiteralPropertyCount(expression) === 0

const hasSomeProperties = (expression: ts.Expression): boolean =>
  objectLiteralPropertyCount(expression) > 0

// The context stage runs once per file, so the hoisted match is shared by every SpreadAssignment the dispatcher feeds to matches.
const conditionalObjectSpreadMatches = (context: RuleContext) => {
  const match = createRuleMatch(context)

  const matches = (spread: ts.SpreadAssignment): ReadonlyArray<Finding> => {
    const expression = unwrapExpression(spread.expression)
    if (!ts.isConditionalExpression(expression)) return []

    const emptyThenNonEmptyElse = [
      hasNoProperties(expression.whenTrue),
      hasSomeProperties(expression.whenFalse)
    ].every(Boolean)
    const nonEmptyThenEmptyElse = [
      hasSomeProperties(expression.whenTrue),
      hasNoProperties(expression.whenFalse)
    ].every(Boolean)

    return [emptyThenNonEmptyElse, nonEmptyThenEmptyElse].some(Boolean)
      ? [match({ ruleId, node: spread, message, hint })]
      : []
  }

  return matches
}

const check = onNode([ts.SyntaxKind.SpreadAssignment])(ts.isSpreadAssignment)(
  conditionalObjectSpreadMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/search.ts",
  code: `declare const params: {
  readonly query: string | null
  readonly page: number | null
}

export const queryParameters = {
  ...(params.query ? { query: params.query } : {}),
  ...(params.page ? { page: params.page } : {})
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/search.ts",
  code: `import { Option, Record } from "effect"

declare const params: {
  readonly query: string | null
  readonly page: number | null
}

export const queryParameters = Record.filterMap(
  {
    query: params.query,
    page: params.page
  },
  Option.fromNullable
)`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const preferEffectRecordFilterMap = new Rule({
  id: ruleId,
  description:
    "Prefer Effect Record.filterMap over object spreads that choose between an object " +
    "literal and an empty object literal.",
  example,
  check
})
