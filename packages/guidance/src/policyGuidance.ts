import { Function } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { makeFindings } from "@better-typescript/core/engine/policy"
import type { Guidance } from "@better-typescript/core/engine/policy/data"

export const factGuidance = <Fact>(message: string, hint: string): Guidance<Fact> => {
  const makeFindingsFor = (match: Match<Fact>) =>
    makeFindings(match.target, message, hint, match.fact)

  return Function.constant(makeFindingsFor)
}
