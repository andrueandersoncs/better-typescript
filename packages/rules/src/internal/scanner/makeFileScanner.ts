import { fileSubscriptions } from "./fileSubscriptions.js"
import { Scanner } from "./scannerData.js"
import { Match } from "./match.js"
import type { MatchContext } from "./matchContext.js"
import { Function } from "effect"

export const makeFileScanner = <Fact>(
  handler: (context: MatchContext) => ReadonlyArray<Match<Fact>>
) => {
  const subscriptions = fileSubscriptions(handler)

  return new Scanner({ plan: Function.constant(subscriptions) })
}
