import type { Match as MatcherMatch } from "@better-typescript/matchers/matcher/match"

export const asTypedMatch = <Fact>(match: MatcherMatch<unknown>): MatcherMatch<Fact> =>
  match as MatcherMatch<Fact>
