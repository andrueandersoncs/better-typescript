import { noMutableArrayMethodsScanner } from "./noMutableArrayMethods.js"

import { Function } from "effect"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makeNoMutableArrayMethods = () => {
  const hint =
    "This is a sign that you're doing something fundamentally procedural when you should " +
    "be taking a more functional approach. Use Effect's Array module, such as " +
    "Array.append(), Array.map(), Array.filter(), Array.sort(), or spread syntax " +
    "instead of manipulating an array in place."

  const makeNoMutableArrayMethodsFindings = (
    match: Match<typeof noMutableArrayMethodsScanner extends Scanner<infer Fact> ? Fact : never>
  ) =>
    makeRuleMessage(`Avoid mutating arrays with Array.prototype.${match.fact.methodName}().`, hint)

  const noMutableArrayMethods = makeRule("no-mutable-array-methods")(noMutableArrayMethodsScanner)(
    Function.constant(makeNoMutableArrayMethodsFindings)
  )

  return noMutableArrayMethods
}

export const noMutableArrayMethods = makeNoMutableArrayMethods()
