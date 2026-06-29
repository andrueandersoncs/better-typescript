import { Array, Schema } from "effect"
import { RuleMatch } from "../rules/index.js"
import type { MatchesPage } from "./paginateMatches.js"

const groupMatchesSchema = Schema.Array(RuleMatch)

class MatchGroup extends Schema.Class<MatchGroup>("MatchGroup")({
  ruleId: Schema.String,
  hint: Schema.String,
  matches: groupMatchesSchema
}) {}

const addMatchToGroups = (
  groups: Map<string, MatchGroup>,
  match: RuleMatch
): Map<string, MatchGroup> => {
  const key = `${match.ruleId}\n${match.hint}`
  const existing = groups.get(key)
  const group = existing
    ? new MatchGroup({
        ruleId: existing.ruleId,
        hint: existing.hint,
        matches: [...existing.matches, match]
      })
    : new MatchGroup({
        ruleId: match.ruleId,
        hint: match.hint,
        matches: [match]
      })

  return groups.set(key, group)
}

const formatLocation = (match: RuleMatch): string =>
  `  ${match.fileName}:${match.line}:${match.column}`

const formatGroup = (group: MatchGroup): string => {
  const heading = `${group.ruleId}\n  Hint: ${group.hint}`
  const locations = Array.map(group.matches, formatLocation).join("\n")

  return `${heading}\n${locations}`
}

export const formatMatches = (matches: ReadonlyArray<RuleMatch>): string => {
  const initial = new Map<string, MatchGroup>()
  const grouped = matches.reduce(addMatchToGroups, initial)
  const groups = [...grouped.values()]

  return Array.map(groups, formatGroup).join("\n\n")
}

export const formatMatchesPage = (page: MatchesPage): string => {
  if (page.matches.length === 0) {
    return `No matches to display at offset ${page.startIndex - 1} (${page.totalCount} matches total).`
  }

  const isCompletePage = page.matches.length === page.totalCount

  if (isCompletePage) {
    return formatMatches(page.matches)
  }

  const hasMoreMatches = page.endIndex < page.totalCount
  const pageSummary = hasMoreMatches
    ? `${formatPageRange(page)} Use --offset ${page.endIndex} to see the next page.`
    : formatPageRange(page)

  return `${formatMatches(page.matches)}\n\n${pageSummary}`
}

const formatPageRange = (page: MatchesPage): string =>
  `Showing matches ${page.startIndex}-${page.endIndex} of ${page.totalCount}.`
