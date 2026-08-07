import { Array, Function } from "effect"
import type { MatcherFilePredicate } from "@better-typescript/matchers/matcher/matcherFilePredicate"
import { runMatchers } from "@better-typescript/matchers/matcher/runMatchers"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"
import type { Detection } from "../location/detectionData.js"
import type { Policy } from "./policyClass.js"
import { detectionsForLocatedPolicies } from "./locatedPolicyDetections.js"
import { policyMatcher } from "./policyMatcher.js"

export const toPolicies =
  (policies: ReadonlyArray<Policy>) =>
  (includesSourceFile: MatcherFilePredicate) =>
  (context: ProgramContext): ReadonlyArray<ReadonlyArray<Detection>> => {
    const matchers = Array.map(policies, policyMatcher)
    const runConfiguredMatchers = Function.flip(runMatchers)(includesSourceFile)
    const matchesByPolicy = runConfiguredMatchers(matchers)(context)

    return detectionsForLocatedPolicies(context)(context.projectRoot)(policies)(matchesByPolicy)
  }
