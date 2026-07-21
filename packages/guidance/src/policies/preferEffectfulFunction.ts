import { makeFindings } from "@better-typescript/core/engine/policy"
import type { Guidance } from "@better-typescript/core/engine/policy/data"
import {
  preferEffectfulFunctionMatcher,
  type PreferEffectfulFunctionFact
} from "@better-typescript/matchers/builtins/preferEffectfulFunction"
import { makeBuiltinPolicy } from "../definePolicy.js"

const preferEffectfulFunctionGuidance: Guidance<PreferEffectfulFunctionFact> = () => (match) => {
  const { functionName } = match.fact

  return makeFindings(
    match.target,
    `Avoid synchronously unwrapping an Effect in ${functionName}.`,
    `Return the Effect from ${functionName} and compose callers with yield* or ` +
      "Effect.flatMap. Reserve Effect.runSync for the application runtime boundary.",
    match.fact
  )
}

export const preferEffectfulFunction = makeBuiltinPolicy(
  "prefer-effectful-function",
  preferEffectfulFunctionMatcher,
  preferEffectfulFunctionGuidance
)
