import { oneFinding } from "@better-typescript/core/engine/policy"
import type { Guidance } from "@better-typescript/core/engine/policy/data"
import {
  preferEffectfulFunctionMatcher,
  type PreferEffectfulFunctionFact
} from "@better-typescript/matchers/builtins/preferEffectfulFunction"
import { defineBuiltinPolicy } from "../definePolicy.js"

const preferEffectfulFunctionGuidance: Guidance<PreferEffectfulFunctionFact> = () => (match) => {
  const { functionName } = match.fact

  return oneFinding(
    match.target,
    `Avoid synchronously unwrapping an Effect in ${functionName}.`,
    `Return the Effect from ${functionName} and compose callers with yield* or ` +
      "Effect.flatMap. Reserve Effect.runSync for the application runtime boundary.",
    match.fact
  )
}

export const preferEffectfulFunction = defineBuiltinPolicy(
  "prefer-effectful-function",
  preferEffectfulFunctionMatcher,
  preferEffectfulFunctionGuidance
)
