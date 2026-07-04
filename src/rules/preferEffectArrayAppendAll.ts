import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { unwrapExpression } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, Finding } from "./types.js"

const ruleId = "prefer-effect-array-append-all"

const message = "Avoid conditional array spreads."

const hint =
  "Use Array.appendAll from Effect to combine arrays instead of spreading a conditional " +
  "expression that chooses between an array and an empty array literal."

const arrayLiteralElementCount = (expression: ts.Expression): number => {
  const unwrapped = unwrapExpression(expression)

  return ts.isArrayLiteralExpression(unwrapped) ? unwrapped.elements.length : -1
}

const isEmptyArrayLiteral = (expression: ts.Expression): boolean =>
  arrayLiteralElementCount(expression) === 0

const isNonEmptyArrayBranch = (expression: ts.Expression): boolean =>
  arrayLiteralElementCount(expression) !== 0

// The context stage runs once per file, so match is shared by every SpreadElement the dispatcher feeds to matches.
const conditionalArraySpreadMatches = (context: RuleContext) => {
  const match = createRuleMatch(context)

  const matches = (spread: ts.SpreadElement): ReadonlyArray<Finding> => {
    if (!ts.isArrayLiteralExpression(spread.parent)) return []

    const expression = unwrapExpression(spread.expression)
    if (!ts.isConditionalExpression(expression)) return []

    const emptyThenNonEmpty = [
      isEmptyArrayLiteral(expression.whenTrue),
      isNonEmptyArrayBranch(expression.whenFalse)
    ].every(Boolean)
    const nonEmptyThenEmpty = [
      isNonEmptyArrayBranch(expression.whenTrue),
      isEmptyArrayLiteral(expression.whenFalse)
    ].every(Boolean)

    return [emptyThenNonEmpty, nonEmptyThenEmpty].some(Boolean)
      ? [match({ ruleId, node: spread, message, hint })]
      : []
  }

  return matches
}

const check = onNode([ts.SyntaxKind.SpreadElement])(ts.isSpreadElement)(
  conditionalArraySpreadMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/names.ts",
  code: `declare const hasPrefix: boolean
declare const prefixNames: ReadonlyArray<string>
declare const mainNames: ReadonlyArray<string>

export const names = [
  ...(hasPrefix ? prefixNames : []),
  ...mainNames
]`
})

const goodExample = new ExampleSnippet({
  filePath: "src/names.ts",
  code: `import { Array } from "effect"

declare const hasPrefix: boolean
declare const prefixNames: ReadonlyArray<string>
declare const mainNames: ReadonlyArray<string>

export const names = Array.appendAll(
  hasPrefix ? prefixNames : [],
  mainNames
)`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const preferEffectArrayAppendAll = new Rule({
  id: ruleId,
  description:
    "Prefer Effect Array.appendAll over array spreads that choose between an array " +
    "expression and an empty array literal.",
  example,
  check
})
