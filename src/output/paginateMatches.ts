import { Function, Option } from "effect"
import type { RuleMatch } from "../rules/index.js"

export interface MatchesPage {
  readonly matches: ReadonlyArray<RuleMatch>
  readonly totalCount: number
  readonly startIndex: number
  readonly endIndex: number
}

export const paginateMatches = (
  matches: ReadonlyArray<RuleMatch>,
  offset: number,
  limit: Option.Option<number>
): MatchesPage => {
  const pageMatches = matches.slice(
    offset,
    offset + Option.getOrElse(limit, Function.constant(matches.length))
  )

  return {
    matches: pageMatches,
    totalCount: matches.length,
    startIndex: offset + 1,
    endIndex: offset + pageMatches.length
  }
}
