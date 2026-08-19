import { Function } from "effect"
import type { Match } from "../../scanner/match.js"
import type { MatchContext } from "../../scanner/matchContext.js"
import { fileSubscriptions } from "../../scanner/fileSubscriptions.js"
import { Scanner } from "../../scanner/scannerData.js"
import { ConceptIndex, conceptIndexFor } from "./conceptIndex.js"

export type ConceptQuery<Fact> = (
  index: ConceptIndex
) => (context: MatchContext) => ReadonlyArray<Match<Fact>>

export const makeConceptQueryScanner = <Fact>(query: ConceptQuery<Fact>) => {
  const subscriptions = Function.compose(query, fileSubscriptions)
  const plan = Function.compose(conceptIndexFor, subscriptions)

  return new Scanner({ plan })
}
