import { Function, Option, Schema } from "effect"
import { Finding } from "../rules/index.js"

const pageMatchesSchema = Schema.Array(Finding)

export class MatchesPage extends Schema.Class<MatchesPage>("MatchesPage")({
  matches: pageMatchesSchema,
  totalCount: Schema.Int,
  startIndex: Schema.Int,
  endIndex: Schema.Int
}) {}

export const paginateMatches =
  (offset: number) =>
  (limit: Option.Option<number>) =>
  (matches: ReadonlyArray<Finding>): MatchesPage => {
    const pageSize = Option.getOrElse(limit, Function.constant(matches.length))
    const pageMatches = matches.slice(offset, offset + pageSize)

    return new MatchesPage({
      matches: pageMatches,
      totalCount: matches.length,
      startIndex: offset + 1,
      endIndex: offset + pageMatches.length
    })
  }
