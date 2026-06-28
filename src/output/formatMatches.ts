import { Array, Schema } from "effect"
import { RuleMatch } from "../rules/index.js"
import type { MatchesPage } from "./paginateMatches.js"

const groupMatchesSchema = Schema.Array(RuleMatch)

class MatchGroup extends Schema.Class<MatchGroup>("MatchGroup")({
  ruleId: Schema.String,
  hint: Schema.String,
  matches: groupMatchesSchema
}) {}

const groupKey = (match: RuleMatch): string => `${match.ruleId}\n${match.hint}`

const startGroup = (match: RuleMatch): MatchGroup =>
  new MatchGroup({ ruleId: match.ruleId, hint: match.hint, matches: [match] })

const extendGroup = (group: MatchGroup, match: RuleMatch): MatchGroup => {
  const matches = [...group.matches, match]

  return new MatchGroup({ ruleId: group.ruleId, hint: group.hint, matches })
}

const addMatchToGroups = (
  groups: Map<string, MatchGroup>,
  match: RuleMatch
): Map<string, MatchGroup> => {
  const key = groupKey(match)
  const existing = groups.get(key)
  const group = existing ? extendGroup(existing, match) : startGroup(match)

  return groups.set(key, group)
}

const groupMatches = (
  matches: ReadonlyArray<RuleMatch>
): ReadonlyArray<MatchGroup> => {
  const initial = new Map<string, MatchGroup>()
  const grouped = matches.reduce(addMatchToGroups, initial)

  return [...grouped.values()]
}

const formatLocation = (match: RuleMatch): string =>
  `  ${match.fileName}:${match.line}:${match.column}`

const formatLocations = (group: MatchGroup): string =>
  Array.map(group.matches, formatLocation).join("\n")

const formatGroup = (group: MatchGroup): string => {
  const heading = `${group.ruleId}\n  Hint: ${group.hint}`
  const locations = formatLocations(group)

  return `${heading}\n${locations}`
}

export const formatMatches = (matches: ReadonlyArray<RuleMatch>): string => {
  const groups = groupMatches(matches)

  return Array.map(groups, formatGroup).join("\n\n")
}

export const formatMatchesPage = (page: MatchesPage): string => {
  if (page.matches.length === 0) {
    return `No matches to display at offset ${page.startIndex - 1} (${page.totalCount} matches total).`
  }

  const isCompletePage = page.matches.length === page.totalCount

  return isCompletePage
    ? formatMatches(page.matches)
    : `${formatMatches(page.matches)}\n\n${formatPageSummary(page)}`
}

const formatPageSummary = (page: MatchesPage): string => {
  const hasMoreMatches = page.endIndex < page.totalCount

  return hasMoreMatches
    ? `${formatPageRange(page)} Use --offset ${page.endIndex} to see the next page.`
    : formatPageRange(page)
}

const formatPageRange = (page: MatchesPage): string =>
  `Showing matches ${page.startIndex}-${page.endIndex} of ${page.totalCount}.`
