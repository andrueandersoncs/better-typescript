import { Function } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { oneFinding } from "@better-typescript/core/engine/policy"
import { conceptControlMatcher } from "@better-typescript/matchers/builtins/conceptControl/conceptControl"
import type { ConceptSignalData } from "@better-typescript/matchers/builtins/conceptControl/data"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { hintFor } from "./conceptControlHints.js"
import { messageFor } from "./conceptControlMessages.js"

const conceptControlFindings = (match: Match<ConceptSignalData>) => {
  const message = messageFor(match.fact)
  const hint = hintFor(match.fact)

  return oneFinding(match.target, message, hint, match.fact)
}

export const conceptControl = defineBuiltinPolicy(
  "concept-control",
  conceptControlMatcher,
  Function.constant(conceptControlFindings)
)
