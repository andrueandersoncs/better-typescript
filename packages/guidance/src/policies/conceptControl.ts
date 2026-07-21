import { Function } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { makeFindings } from "@better-typescript/core/engine/policy"
import { conceptControlMatcher } from "@better-typescript/matchers/builtins/conceptControl/conceptControl"
import type { ConceptSignalData } from "@better-typescript/matchers/builtins/conceptControl/data"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { hintFor } from "./conceptControlHints.js"
import { messageFor } from "./conceptControlMessages.js"

const makeConceptControlFindings = (match: Match<ConceptSignalData>) => {
  const message = messageFor(match.fact)
  const hint = hintFor(match.fact)

  return makeFindings(match.target, message, hint, match.fact)
}

export const conceptControl = makeBuiltinPolicy(
  "concept-control",
  conceptControlMatcher,
  Function.constant(makeConceptControlFindings)
)
