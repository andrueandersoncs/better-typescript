import { fileSubscriptions } from "./fileSubscriptions.js"
import { makeScannerFromSubscriptions } from "./makeScannerFromSubscriptions.js"
import { Match } from "./match.js"
import type { MatchContext } from "./matchContext.js"
import { Function, pipe } from "effect"

export const fileScanner = <Fact>(handler: (context: MatchContext) => ReadonlyArray<Match<Fact>>) =>
  pipe(fileSubscriptions(handler), Function.constant, makeScannerFromSubscriptions)
