import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-new-error"

const isErrorIdentifier = (identifier: ts.Identifier): boolean => identifier.text === "Error"

const isBareErrorConstruction = (newExpression: ts.NewExpression): boolean => {
  const constructorIdentifier = Option.liftPredicate(ts.isIdentifier)(newExpression.expression)

  return Option.exists(constructorIdentifier, isErrorIdentifier)
}

const newErrorMatches = (
  newExpression: ts.NewExpression,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  isBareErrorConstruction(newExpression)
    ? [
        createRuleMatch(context, {
          ruleId,
          node: newExpression,
          message: "Avoid using new Error() directly.",
          hint:
            "Declare a custom error with Effect Schema.TaggedError, then use new CustomError() " +
            "instead of bare new Error()."
        })
      ]
    : []

const check = onNode([ts.SyntaxKind.NewExpression], ts.isNewExpression, newErrorMatches)

export const noNewError = new Rule({
  id: ruleId,
  description: "Disallow direct Error construction in favor of Effect Schema tagged errors.",
  check
})
