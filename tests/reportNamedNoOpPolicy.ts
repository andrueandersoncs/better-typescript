import { type Policy } from "@better-typescript/core/engine/policy/policyClass"
import { makePolicy } from "@better-typescript/core/engine/policy/makePolicy"
import { emptyGuidance } from "./reportEmptyGuidance.js"
import { emptyMatcher } from "./reportEmptyMatcher.js"
import { probeExamples } from "./reportProbeExamples.js"

export const namedNoOpPolicy = (name: string): Policy =>
  makePolicy({
    name,
    matcher: emptyMatcher,
    guidance: emptyGuidance,
    examples: probeExamples
  })
