import { fileSubscriptions } from "./fileSubscriptions.js"
import { makeMatcherFromSubscriptions } from "./makeMatcherFromSubscriptions.js"
import { Match } from "./match.js"
import type { MatchContext } from "./matchContext.js"
import { Function, pipe } from "effect"

export const fileMatcher = <Fact>(handler: (context: MatchContext) => ReadonlyArray<Match<Fact>>) =>
  pipe(fileSubscriptions(handler), Function.constant, makeMatcherFromSubscriptions)
