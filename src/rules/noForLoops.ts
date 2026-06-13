import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-for-loops"

const hasIteratorAndStopCondition = (forStatement: ts.ForStatement): boolean => {
  const condition = Option.fromNullable(forStatement.condition)
  const initializer = Option.fromNullable(forStatement.initializer)
  const incrementor = Option.fromNullable(forStatement.incrementor)
  const hasStopCondition = Option.isSome(condition)
  const hasInitializer = Option.isSome(initializer)
  const hasIncrementor = Option.isSome(incrementor)
  const hasIterator = [hasInitializer, hasIncrementor].some(Boolean)

  return [hasStopCondition, hasIterator].every(Boolean)
}

const forMatches = (
  forStatement: ts.ForStatement,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  hasIteratorAndStopCondition(forStatement)
    ? [
        createRuleMatch(context, {
          ruleId,
          node: forStatement,
          message: "Avoid imperative logic in iterator-based for loops.",
          hint:
            "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
            "Array.filter(), or Array.flatMap(), instead."
        })
      ]
    : []

const check = onNode([ts.SyntaxKind.ForStatement], ts.isForStatement, forMatches)

export const noForLoops = new Rule({
  id: ruleId,
  description: "Disallow iterator-based for loops in favor of Effect collection operations.",
  check
})
