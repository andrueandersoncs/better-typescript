import { noInlineClosuresMatcher } from "@better-typescript/matchers/builtins/noInlineClosures"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message =
  "Avoid arrow functions outside naming, currying, and third-party callback positions."

const hint =
  "Name this function as a top-level const and pass it by reference, currying it when it " +
  "needs values from the enclosing scope. Inline arrows are permitted only as arguments " +
  "to third-party functions (effect combinators, node_modules callbacks). When the " +
  "expression sequences several steps, prefer a generator (Option.gen or Effect.gen) " +
  "over nesting functions."

export const noInlineClosures = makeBuiltinPolicy(
  "no-inline-closures",
  noInlineClosuresMatcher,
  factGuidance(message, hint)
)
