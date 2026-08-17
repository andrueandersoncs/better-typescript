import { Function, pipe } from "effect"
import { fileSubscriptions } from "../matcher/fileSubscriptions.js"
import type { Match } from "../matcher/match.js"
import type { MatchContext } from "../matcher/matchContext.js"
import type { Matcher } from "../matcher/matcherData.js"
import type { Subscription } from "../matcher/subscription.js"

export const fileElementsMatcher = <Evidence>(
  wire: <Fact>(
    subscriptions: (evidence: Evidence) => ReadonlyArray<Subscription<Fact>>
  ) => Matcher<Fact>
) => {
  type FileElementCollector<Fact> = (
    evidence: Evidence
  ) => (context: MatchContext) => ReadonlyArray<Match<Fact>>

  const matcherForElements = <Fact>(elements: FileElementCollector<Fact>): Matcher<Fact> =>
    pipe(elements, Function.compose(fileSubscriptions), wire)

  return matcherForElements
}
