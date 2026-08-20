import { noMutableVariableDeclarationsScanner } from "./noMutableVariableDeclarations.js"

import { Function } from "effect"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makeNoMutableVariableDeclarations = () => {
  const hint =
    "Declare multiple const values to represent each state instead of mutating a single " +
    "variable, and use immutable values that are not reassigned. When the value must " +
    "genuinely evolve over time (a module-level counter, a cell shared across " +
    "closures), hold it in a Ref inside the Effect runtime instead of a let binding."

  const makeNoMutableVariableDeclarationsFindings = (
    match: Match<
      typeof noMutableVariableDeclarationsScanner extends Scanner<infer Fact> ? Fact : never
    >
  ) => makeRuleMessage(`Avoid declaring mutable variables with ${match.fact.kind}.`, hint)

  const noMutableVariableDeclarations = makeRule("no-mutable-variable-declarations")(
    noMutableVariableDeclarationsScanner
  )(Function.constant(makeNoMutableVariableDeclarationsFindings))

  return noMutableVariableDeclarations
}

export const noMutableVariableDeclarations = makeNoMutableVariableDeclarations()
