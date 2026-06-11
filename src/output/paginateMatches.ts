import { Function, Option, Schema } from "effect"
import { RuleMatch } from "../rules/index.js"

export class MatchesPage extends Schema.Class<MatchesPage>("MatchesPage")({
  matches: Schema.Array(RuleMatch),
  totalCount: Schema.Int,
  startIndex: Schema.Int,
  endIndex: Schema.Int
}) {}

export const paginateMatches = (
  matches: ReadonlyArray<RuleMatch>,
  offset: number,
  limit: Option.Option<number>
): MatchesPage => {
  const pageMatches = matches.slice(
    offset,
    offset + Option.getOrElse(limit, Function.constant(matches.length))
  )

  return new MatchesPage({
    matches: pageMatches,
    totalCount: matches.length,
    startIndex: offset + 1,
    endIndex: offset + pageMatches.length
  })
}
