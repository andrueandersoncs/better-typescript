import { Function } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { oneFinding } from "@better-typescript/core/engine/policy"
import type { Guidance } from "@better-typescript/core/engine/policy/data"

export const factGuidance = <Fact>(message: string, hint: string): Guidance<Fact> => {
  const findingsFor = (match: Match<Fact>) => oneFinding(match.target, message, hint, match.fact)

  return Function.constant(findingsFor)
}
