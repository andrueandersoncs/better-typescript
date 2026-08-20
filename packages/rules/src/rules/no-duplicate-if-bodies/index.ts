import { noDuplicateIfBodiesScanner } from "./noDuplicateIfBodies.js"

import { Function } from "effect"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makeNoDuplicateIfBodies = () => {
  const message = "Avoid if branches that repeat the body of the branch before them."

  const makeNoDuplicateIfBodiesFindings = (
    match: Match<typeof noDuplicateIfBodiesScanner extends Scanner<infer Fact> ? Fact : never>
  ) =>
    makeRuleMessage(
      message,
      "These branches are pseudo-duplicates: the bodies are identical and only the " +
        "conditions differ. Combine them into a single branch: " +
        `if (${match.fact.combinedCondition}) { ... }.`
    )

  const noDuplicateIfBodies = makeRule("no-duplicate-if-bodies")(noDuplicateIfBodiesScanner)(
    Function.constant(makeNoDuplicateIfBodiesFindings)
  )

  return noDuplicateIfBodies
}

export const noDuplicateIfBodies = makeNoDuplicateIfBodies()
