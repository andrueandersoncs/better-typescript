import { noNestedIfStatementsScanner } from "./noNestedIfStatements.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

const makeNoNestedIfStatements = () => {
  const message = "Avoid nesting if statements."

  const hint =
    "Combine related conditions with boolean operators, or use an early return so this " +
    "condition can remain a single-level if statement."

  const noNestedIfStatements = makeRule("no-nested-if-statements")(noNestedIfStatementsScanner)(
    fixedRuleMessage(message, hint)
  )

  return noNestedIfStatements
}

export const noNestedIfStatements = makeNoNestedIfStatements()
