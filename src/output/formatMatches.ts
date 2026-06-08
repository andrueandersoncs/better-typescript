import type { RuleMatch } from "../rules/index.js"

export function formatMatches(matches: ReadonlyArray<RuleMatch>): string {
  return matches
    .map(
      (match) =>
        `${match.fileName}:${match.line}:${match.column} ${match.ruleId}\n` +
        `  ${match.message}\n` +
        `  Hint: ${match.hint}`
    )
    .join("\n\n")
}
