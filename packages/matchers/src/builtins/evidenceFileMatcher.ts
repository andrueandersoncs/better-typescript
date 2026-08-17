import { Function } from "effect"
import { makeMatcherFromSubscriptions } from "../matcher/makeMatcherFromSubscriptions.js"
import type { Subscription } from "../matcher/subscription.js"
import type { ProgramContext } from "../sources/data.js"
import { fileElementsMatcher } from "./fileElementSubscriptions.js"

export const evidenceFileMatcher = <Evidence>(
  evidenceFor: (context: ProgramContext) => Evidence
) => {
  const wire = <Fact>(subscriptions: (evidence: Evidence) => ReadonlyArray<Subscription<Fact>>) =>
    makeMatcherFromSubscriptions(Function.compose(evidenceFor, subscriptions))

  return fileElementsMatcher(wire)
}
