import { Function } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { oneFinding } from "@better-typescript/core/engine/policy"
import { defineBuiltinPolicy } from "../definePolicy.js"
import {
  noInstanceofMatcher,
  type NoInstanceofFact
} from "@better-typescript/matchers/builtins/noInstanceof"

const hint =
  "Use a stable discriminant, an explicit structural type guard, or Schema.is with a " +
  "structurally defined Schema such as Schema.Struct. Schema.is on Schema.Class retains " +
  "constructor semantics, so it does not make a class check structural or cross-realm safe."

const noInstanceofFindings = (match: Match<NoInstanceofFact>) =>
  oneFinding(
    match.target,
    `Avoid instanceof for the first-party class "${match.fact.className}".`,
    hint,
    undefined
  )

export const noInstanceof = defineBuiltinPolicy(
  "no-instanceof",
  noInstanceofMatcher,
  Function.constant(noInstanceofFindings)
)
