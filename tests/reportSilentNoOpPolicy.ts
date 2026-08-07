import { type Policy } from "@better-typescript/core/engine/policy/policyClass"
import { makeSilentPolicy } from "@better-typescript/core/engine/policy/makeSilentPolicy"
import { emptyRefactorExampleSource } from "@better-typescript/core/engine/example/examplesFromDefinition"
import { emptyGuidance } from "./reportEmptyGuidance.js"
import { emptyMatcher } from "./reportEmptyMatcher.js"

export const silentNoOpPolicy = (name: string): Policy =>
  makeSilentPolicy({
    name,
    matcher: emptyMatcher,
    guidance: emptyGuidance,
    examples: emptyRefactorExampleSource
  })
