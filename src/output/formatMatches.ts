import { Array, Function, Option, Schema, Struct } from "effect"
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

const groupMatches = (matches: ReadonlyArray<RuleMatch>): ReadonlyArray<MatchGroup> => {
  const initial = new Map<string, MatchGroup>()
  const grouped = matches.reduce(addMatchToGroups, initial)

  return [...grouped.values()]
}

const groupMessages = (group: MatchGroup): ReadonlyArray<string> =>
  Array.map(group.matches, Struct.get("message"))

const sharedMessage = (group: MatchGroup): Option.Option<string> => {
  const messages = groupMessages(group)
  const distinct = Array.dedupe(messages)
  const isSingleMessage = distinct.length === 1

  return isSingleMessage ? Array.head(distinct) : Option.none()
}

const matchLocation = (match: RuleMatch): string =>
  `${match.fileName}:${match.line}:${match.column}`

const formatBareLocation = (match: RuleMatch): string => `  ${matchLocation(match)}`

const formatLabelledLocation = (match: RuleMatch): string =>
  `  ${matchLocation(match)}\n    ${match.message}`

const formatLocations = (group: MatchGroup, hasSharedMessage: boolean): string => {
  const formatter = hasSharedMessage ? formatBareLocation : formatLabelledLocation

  return Array.map(group.matches, formatter).join("\n")
}

const prefixMessage = (message: string): string => `\n  ${message}`

const emptyString = Function.constant("")

const headingMessage = (shared: Option.Option<string>): string => {
  const prefixed = Option.map(shared, prefixMessage)

  return Option.getOrElse(prefixed, emptyString)
}

const formatGroup = (group: MatchGroup): string => {
  const shared = sharedMessage(group)
  const hasSharedMessage = Option.isSome(shared)
  const heading = `${group.ruleId}${headingMessage(shared)}\n  Hint: ${group.hint}`
  const locations = formatLocations(group, hasSharedMessage)

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
