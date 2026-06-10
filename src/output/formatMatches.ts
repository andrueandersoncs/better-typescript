import type { MatchesPage } from "./paginateMatches.js"
import type { RuleMatch } from "../rules/index.js"

export const formatMatches = (matches: ReadonlyArray<RuleMatch>): string =>
  matches
    .map(
      (match) =>
        `${match.fileName}:${match.line}:${match.column} ${match.ruleId}\n` +
        `  ${match.message}\n` +
        `  Hint: ${match.hint}`
    )
    .join("\n\n")

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
