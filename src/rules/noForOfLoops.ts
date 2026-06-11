import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import type { Rule } from "./types.js"

const ruleId = "no-for-of-loops"

export const noForOfLoops: Rule = {
  id: ruleId,
  description: "Disallow for..of loops in favor of immutable collection operations.",
  check: onNode([ts.SyntaxKind.ForOfStatement], ts.isForOfStatement, (forOfStatement, context) => [
    createRuleMatch(context, {
      ruleId,
      node: forOfStatement,
      message: "Avoid imperative logic in for..of loops.",
      hint:
        "Use immutable collection logic such as Array.prototype.map(), " +
        "Array.prototype.reduce(), Array.prototype.filter(), Array.prototype.flatMap(), " +
        "or Streams for async iterables instead."
    })
  ])
}
