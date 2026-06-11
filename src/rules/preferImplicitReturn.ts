import { Option } from "effect"
import * as ts from "typescript"
import { onNode } from "./ruleCheck.js"
import { createRuleMatch } from "./ruleMatch.js"
import { Rule } from "./types.js"
import type { RuleContext, RuleMatch } from "./types.js"

const ruleId = "prefer-implicit-return"

type ArrowFunctionWithBlockBody = ts.ArrowFunction & {
  readonly body: ts.Block
}

const hasSingleValueReturnStatement = (
  arrowFunction: ts.ArrowFunction
): arrowFunction is ArrowFunctionWithBlockBody => {
  if (ts.isBlock(arrowFunction.body)) {
    const hasOneStatement = arrowFunction.body.statements.length === 1
    const firstStatement = arrowFunction.body.statements[0]
    const hasSingleReturn = hasOneStatement && isValueReturnStatement(firstStatement)

    return hasSingleReturn
  }

  return false
}

const returnedExpression = (statement: ts.ReturnStatement): Option.Option<ts.Expression> =>
  Option.fromNullable(statement.expression)

const isValueReturnStatement = (statement: ts.Statement): boolean =>
  Option.liftPredicate(ts.isReturnStatement)(statement).pipe(
    Option.flatMap(returnedExpression),
    Option.isSome
  )

const implicitReturnMatches = (
  arrowFunction: ts.ArrowFunction,
  context: RuleContext
): ReadonlyArray<RuleMatch> =>
  hasSingleValueReturnStatement(arrowFunction)
    ? [
        createRuleMatch(context, {
          ruleId,
          node: arrowFunction.body,
          message: "Avoid arrow function block bodies that only return a value.",
          hint:
            "Replace this with an implicit return by removing the return statement and function " +
            "body braces. Wrap object literals in parentheses when needed."
        })
      ]
    : []

const check = onNode([ts.SyntaxKind.ArrowFunction], ts.isArrowFunction, implicitReturnMatches)

export const preferImplicitReturn = new Rule({
  id: ruleId,
  description: "Prefer implicit arrow function returns over block bodies with a single return.",
  check
})
