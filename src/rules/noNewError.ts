import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "no-new-error"

const isErrorIdentifier = (identifier: ts.Identifier): boolean =>
  identifier.text === "Error"

const newErrorMatches = (
  newExpression: ts.NewExpression,
  context: RuleContext
): ReadonlyArray<RuleMatch> => {
  const constructorIdentifier = Option.liftPredicate(ts.isIdentifier)(
    newExpression.expression
  )
  const isBareErrorConstruction = Option.exists(
    constructorIdentifier,
    isErrorIdentifier
  )

  return isBareErrorConstruction
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
}

const check = onNode(
  [ts.SyntaxKind.NewExpression],
  ts.isNewExpression,
  newErrorMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/errors.ts",
  code: `const err = new Error("Not found")`
})

const goodExample = new ExampleSnippet({
  filePath: "src/errors.ts",
  code: `class NotFound extends Schema.TaggedError<NotFound>("NotFound")("NotFound", {}) {}

const err = new NotFound()`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const noNewError = new Rule({
  id: ruleId,
  description:
    "Disallow direct Error construction in favor of Effect Schema tagged errors.",
  example,
  check
})
