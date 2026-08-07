import { makeMatcherFromSubscriptions } from "@better-typescript/matchers/matcher/makeMatcherFromSubscriptions"

export const emptyMatcher = makeMatcherFromSubscriptions(() => [])
