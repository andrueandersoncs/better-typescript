import { makePolicy } from "@better-typescript/core/engine/policy/makePolicy"
import { makeSilentPolicy } from "@better-typescript/core/engine/policy/makeSilentPolicy"
import { emptyRefactorExampleSource } from "@better-typescript/core/engine/example/examplesFromDefinition"
import { emptyGuidance } from "./loadWiringConfigEmptyGuidance.js"
import { emptyMatcher } from "./loadWiringConfigEmptyMatcher.js"

export const makeEmptyPolicy = (name: string, reported = true) =>
  reported
    ? makePolicy({
        name,
        matcher: emptyMatcher,
        guidance: emptyGuidance,
        examples: emptyRefactorExampleSource
      })
    : makeSilentPolicy({
        name,
        matcher: emptyMatcher,
        guidance: emptyGuidance,
        examples: emptyRefactorExampleSource
      })
