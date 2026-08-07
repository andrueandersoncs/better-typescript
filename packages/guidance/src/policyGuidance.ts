import { Function } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/match"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import { type Guidance } from "@better-typescript/core/engine/policy/guidance"

export const factGuidance = <Fact>(message: string, hint: string): Guidance<Fact> => {
  const makeFindingsFor = (match: Match<Fact>) =>
    makeFindings(match.target, message, hint, match.fact)

  return Function.constant(makeFindingsFor)
}
