import { Option, pipe } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { returnedExpression } from "./tsNode.js"
import { ExampleSnippet, Rule, RuleExample } from "./types.js"
import type { RuleContext, Finding } from "./types.js"

const ruleId = "prefer-implicit-return"

type ArrowFunctionWithBlockBody = ts.ArrowFunction & {
  readonly body: ts.Block
}

// The context stage runs once per file, so the hoisted match is shared by every ArrowFunction the dispatcher feeds to matches.
const implicitReturnMatches = (context: RuleContext) => {
  const match = createRuleMatch(context)

  const matches = (arrowFunction: ts.ArrowFunction): ReadonlyArray<Finding> => {
    if (!ts.isBlock(arrowFunction.body)) return []
    const hasOneStatement = arrowFunction.body.statements.length === 1
    const firstStatement = arrowFunction.body.statements[0]
    const hasSingleValueReturn =
      hasOneStatement &&
      pipe(
        Option.liftPredicate(ts.isReturnStatement)(firstStatement),
        Option.flatMap(returnedExpression),
        Option.isSome
      )

    return hasSingleValueReturn
      ? [
          match({
            ruleId,
            node: arrowFunction.body,
            message:
              "Avoid arrow function block bodies that only return a value.",
            hint:
              "Replace this with an implicit return by removing the return statement and function " +
              "body braces. Wrap object literals in parentheses when needed."
          })
        ]
      : []
  }

  return matches
}

const check = onNode([ts.SyntaxKind.ArrowFunction])(ts.isArrowFunction)(
  implicitReturnMatches
)

const badExample = new ExampleSnippet({
  filePath: "src/math.ts",
  code: `const double = (n: number) => {
  return n * 2
}`
})

const goodExample = new ExampleSnippet({
  filePath: "src/math.ts",
  code: `const double = (n: number) => n * 2`
})

const example = new RuleExample({
  bad: [badExample],
  good: [goodExample]
})

export const preferImplicitReturn = new Rule({
  id: ruleId,
  description:
    "Prefer implicit arrow function returns over block bodies with a single return.",
  example,
  check
})
