import { makePolicy } from "@better-typescript/core/engine/policy/makePolicy"
import { makeSilentPolicy } from "@better-typescript/core/engine/policy/makeSilentPolicy"
import { emptyRefactorExampleSource } from "@better-typescript/core/engine/example/examplesFromDefinition"
import { makeMatcherFromSubscriptions } from "@better-typescript/matchers/matcher/makeMatcherFromSubscriptions"

const emptyGuidance = () => () => []
const emptyMatcher = makeMatcherFromSubscriptions(() => [])

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
