import { Function } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { makeFindings } from "@better-typescript/core/engine/policy"
import { makeBuiltinPolicy } from "../definePolicy.js"
import {
  noDuplicateFunctionNamesMatcher,
  type NoDuplicateFunctionNamesFact
} from "@better-typescript/matchers/builtins/noDuplicateFunctionNames"

const makeNoDuplicateFunctionNamesFindings = (match: Match<NoDuplicateFunctionNamesFact>) => {
  const functionName = match.fact.functionName
  const otherFiles = match.fact.otherFiles

  return makeFindings(
    match.target,
    `Avoid declaring the top-level function ${functionName} with an identical signature in multiple files.`,
    `${functionName} is declared with the same signature in ${otherFiles}, which makes ` +
      "the copies semantic duplicates. Extract one shared implementation into a module " +
      "scoped to its domain and import it from every file that uses it. Name the module " +
      "after the concept it serves (ts.Node helpers belong in ts-node.ts), not a generic " +
      "lib.ts or utils.ts. Same-name functions over different signatures (user.ts#make, " +
      "account.ts#make) are module vocabulary, not duplicates.",
    undefined
  )
}

export const noDuplicateFunctionNames = makeBuiltinPolicy(
  "no-duplicate-function-names",
  noDuplicateFunctionNamesMatcher,
  Function.constant(makeNoDuplicateFunctionNamesFindings)
)
