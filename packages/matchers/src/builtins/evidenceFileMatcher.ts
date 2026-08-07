import { Function, flow } from "effect"
import { makeMatcherFromSubscriptions } from "../matcher/makeMatcherFromSubscriptions.js"
import type { Subscription } from "../matcher/subscription.js"
import type { ProgramContext } from "../sources/data.js"
import { fileElementsMatcher } from "./fileElementSubscriptions.js"

export const evidenceFileMatcher = <Evidence>(
  evidenceFor: (context: ProgramContext) => Evidence
) => {
  const subscriptionsForEvidence = (
    subscriptions: (evidence: Evidence) => ReadonlyArray<Subscription>
  ) => Function.compose(evidenceFor, subscriptions)

  const wire = flow(subscriptionsForEvidence, makeMatcherFromSubscriptions)

  return fileElementsMatcher(wire)
}
