import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import type { Rule } from "./types.js"

const ruleId = "no-new-error"

export const noNewError: Rule = {
  id: ruleId,
  description: "Disallow direct Error construction in favor of Effect Schema tagged errors.",
  check: onNode([ts.SyntaxKind.NewExpression], ts.isNewExpression, (newExpression, context) =>
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
  )
}

const isBareErrorConstruction = (newExpression: ts.NewExpression): boolean =>
  Option.match(Option.liftPredicate(ts.isIdentifier)(newExpression.expression), {
    onNone: () => false,
    onSome: (expression) => expression.text === "Error"
  })
