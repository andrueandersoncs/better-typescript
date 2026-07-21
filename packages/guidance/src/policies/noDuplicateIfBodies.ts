import { Function } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { makeFindings } from "@better-typescript/core/engine/policy"
import { makeBuiltinPolicy } from "../definePolicy.js"
import {
  noDuplicateIfBodiesMatcher,
  type NoDuplicateIfBodiesFact
} from "@better-typescript/matchers/builtins/noDuplicateIfBodies"

const message = "Avoid if branches that repeat the body of the branch before them."

const makeNoDuplicateIfBodiesFindings = (match: Match<NoDuplicateIfBodiesFact>) =>
  makeFindings(
    match.target,
    message,
    "These branches are pseudo-duplicates: the bodies are identical and only the " +
      "conditions differ. Combine them into a single branch: " +
      `if (${match.fact.combinedCondition}) { ... }.`,
    undefined
  )

export const noDuplicateIfBodies = makeBuiltinPolicy(
  "no-duplicate-if-bodies",
  noDuplicateIfBodiesMatcher,
  Function.constant(makeNoDuplicateIfBodiesFindings)
)
