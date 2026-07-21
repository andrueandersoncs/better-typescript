import { oneFinding } from "@better-typescript/core/engine/policy"
import type { Guidance } from "@better-typescript/core/engine/policy/data"
import {
  preferResultConceptNamesMatcher,
  type PreferResultConceptNamesFact
} from "@better-typescript/matchers/builtins/preferResultConceptNames"
import { defineBuiltinPolicy } from "../definePolicy.js"

const preferResultConceptNamesGuidance: Guidance<PreferResultConceptNamesFact> = () => (match) => {
  const { nameText, claimed, expected } = match.fact

  return oneFinding(
    match.target,
    `${nameText} names its result as ${claimed}, but it returns ${expected}.`,
    `Rename the result phrase to ${expected}. Preserve operation and source qualifiers, ` +
      `using ${expected}FromSource or sourceTo${expected} when direction matters.`,
    match.fact
  )
}

export const preferResultConceptNames = defineBuiltinPolicy(
  "prefer-result-concept-names",
  preferResultConceptNamesMatcher,
  preferResultConceptNamesGuidance
)
