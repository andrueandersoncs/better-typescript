import { Function, flow } from "effect"
import { fileSubscriptions } from "../matcher/fileSubscriptions.js"
import type { Match } from "../matcher/match.js"
import type { MatchContext } from "../matcher/matchContext.js"
import type { Matcher } from "../matcher/matcherData.js"
import type { Subscription } from "../matcher/subscription.js"

export const fileElementsMatcher = <Evidence>(
  wire: (subscriptions: (evidence: Evidence) => ReadonlyArray<Subscription>) => Matcher
) => {
  type FileElementCollector<Fact> = (
    evidence: Evidence
  ) => (context: MatchContext) => ReadonlyArray<Match<Fact>>

  const fileElementSubscriptions = <Fact>(
    elements: FileElementCollector<Fact>
  ): ((evidence: Evidence) => ReadonlyArray<Subscription>) =>
    Function.compose(elements, fileSubscriptions)

  return flow(fileElementSubscriptions, wire)
}
