import { FileSubscription } from "./fileSubscription.js"
import { Match } from "./match.js"
import type { MatchContext } from "./matchContext.js"
import type { Subscription } from "./subscription.js"
import { Array, pipe } from "effect"

export const fileSubscriptions = <Fact>(
  handler: (context: MatchContext) => ReadonlyArray<Match<Fact>>
): ReadonlyArray<Subscription<Fact>> => pipe(new FileSubscription({ handler }), Array.of)
