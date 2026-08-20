import { noDuplicateFunctionNamesScanner } from "./noDuplicateFunctionNames.js"

import { Function } from "effect"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makeNoDuplicateFunctionNames = () => {
  const makeNoDuplicateFunctionNamesFindings = (
    match: Match<typeof noDuplicateFunctionNamesScanner extends Scanner<infer Fact> ? Fact : never>
  ) =>
    makeRuleMessage(
      `Avoid declaring the top-level function ${match.fact.functionName} with an identical signature in multiple files.`,
      `${match.fact.functionName} is declared with the same signature in ${match.fact.otherFiles}, which makes ` +
        "the copies semantic duplicates. Extract one shared implementation into a module " +
        "scoped to its domain and import it from every file that uses it. Name the module " +
        "after the concept it serves (ts.Node helpers belong in ts-node.ts), not a generic " +
        "lib.ts or utils.ts. Same-name functions over different signatures (user.ts#make, " +
        "account.ts#make) are module vocabulary, not duplicates."
    )

  const noDuplicateFunctionNames = makeRule("no-duplicate-function-names")(
    noDuplicateFunctionNamesScanner
  )(Function.constant(makeNoDuplicateFunctionNamesFindings))

  return noDuplicateFunctionNames
}

export const noDuplicateFunctionNames = makeNoDuplicateFunctionNames()
