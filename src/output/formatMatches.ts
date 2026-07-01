import { Array, Function, HashMap, Option, Schema, Struct, pipe } from "effect"
import { ExampleSnippet, RuleMatch } from "../rules/index.js"
import type { Rule } from "../rules/index.js"
import type { MatchesPage } from "./paginateMatches.js"

const groupMatchesSchema = Schema.Array(RuleMatch)

class MatchGroup extends Schema.Class<MatchGroup>("MatchGroup")({
  ruleId: Schema.String,
  hint: Schema.String,
  matches: groupMatchesSchema
}) {}

class MatchLocation extends Schema.Class<MatchLocation>("MatchLocation")({
  fileName: Schema.String,
  line: Schema.Int,
  column: Schema.Int,
  message: Schema.String
}) {}

const exampleSnippetsSchema = Schema.Array(ExampleSnippet)
const locationsSchema = Schema.Array(MatchLocation)

class RuleReport extends Schema.Class<RuleReport>("RuleReport")({
  ruleId: Schema.String,
  description: Schema.String,
  hint: Schema.String,
  good: exampleSnippetsSchema,
  matches: locationsSchema
}) {}

const ruleReportsSchema = Schema.Array(RuleReport)

class MatchesReport extends Schema.Class<MatchesReport>("MatchesReport")({
  totalCount: Schema.Int,
  startIndex: Schema.Int,
  endIndex: Schema.Int,
  groups: ruleReportsSchema
}) {}

type RulesById = HashMap.HashMap<string, Rule>

const newGroup = (match: RuleMatch) => (): MatchGroup =>
  new MatchGroup({
    ruleId: match.ruleId,
    hint: match.hint,
    matches: [match]
  })

const appendMatch =
  (match: RuleMatch) =>
  (existing: MatchGroup): MatchGroup => {
    const matches = Array.append(existing.matches, match)

    return new MatchGroup({
      ruleId: existing.ruleId,
      hint: existing.hint,
      matches
    })
  }

const addMatchToGroups = (
  groups: HashMap.HashMap<string, MatchGroup>,
  match: RuleMatch
): HashMap.HashMap<string, MatchGroup> => {
  const key = `${match.ruleId}\n${match.hint}`
  const group = pipe(
    HashMap.get(groups, key),
    Option.map(appendMatch(match)),
    Option.getOrElse(newGroup(match))
  )

  return HashMap.set(groups, key, group)
}

const matchGroups = (
  matches: ReadonlyArray<RuleMatch>
): ReadonlyArray<MatchGroup> => {
  const initial = HashMap.empty<string, MatchGroup>()
  const grouped = matches.reduce(addMatchToGroups, initial)

  return HashMap.toValues(grouped)
}

const ruleEntry = (rule: Rule): readonly [string, Rule] => [rule.id, rule]

const rulesById = (rules: ReadonlyArray<Rule>): RulesById => {
  const entries = rules.map(ruleEntry)

  return HashMap.fromIterable(entries)
}

const ruleGoodExamples = (rule: Rule): ReadonlyArray<ExampleSnippet> =>
  rule.example.good

const ruleDescription: (rule: Rule) => string = Struct.get("description")

const emptySnippets: Function.LazyArg<ReadonlyArray<ExampleSnippet>> =
  Function.constant([])

const emptyDescription: Function.LazyArg<string> = Function.constant("")

const goodExamplesForRule =
  (rulesLookup: RulesById) =>
  (ruleId: string): ReadonlyArray<ExampleSnippet> =>
    pipe(
      HashMap.get(rulesLookup, ruleId),
      Option.map(ruleGoodExamples),
      Option.getOrElse(emptySnippets)
    )

const descriptionForRule =
  (rulesLookup: RulesById) =>
  (ruleId: string): string =>
    pipe(
      HashMap.get(rulesLookup, ruleId),
      Option.map(ruleDescription),
      Option.getOrElse(emptyDescription)
    )

const indentSnippetLine = (line: string): string => `    ${line}`

const formatGoodSnippet = (snippet: ExampleSnippet): string => {
  const codeLines = snippet.code.split("\n")
  const indentedCode = Array.map(codeLines, indentSnippetLine).join("\n")

  return `  Good (${snippet.filePath}):\n${indentedCode}`
}

const formatLocation = (match: RuleMatch): string =>
  `  ${match.fileName}:${match.line}:${match.column}`

const formatGroup =
  (rulesLookup: RulesById) =>
  (group: MatchGroup): string => {
    const heading = `${group.ruleId}\n  Hint: ${group.hint}`
    const goodExamples = goodExamplesForRule(rulesLookup)(group.ruleId)
    const exampleSections = Array.map(goodExamples, formatGoodSnippet)
    const locations = Array.map(group.matches, formatLocation)
    const sections = Array.flatten([[heading], exampleSections, locations])

    return Array.join(sections, "\n")
  }

const matchLocation = (match: RuleMatch): MatchLocation =>
  new MatchLocation({
    fileName: match.fileName,
    line: match.line,
    column: match.column,
    message: match.message
  })

const ruleReport =
  (rulesLookup: RulesById) =>
  (group: MatchGroup): RuleReport => {
    const description = descriptionForRule(rulesLookup)(group.ruleId)
    const good = goodExamplesForRule(rulesLookup)(group.ruleId)
    const locations = Array.map(group.matches, matchLocation)

    return new RuleReport({
      ruleId: group.ruleId,
      description,
      hint: group.hint,
      good,
      matches: locations
    })
  }

export const formatMatches =
  (rules: ReadonlyArray<Rule>) =>
  (matches: ReadonlyArray<RuleMatch>): string => {
    const groups = matchGroups(matches)
    const rulesLookup = rulesById(rules)

    return Array.map(groups, formatGroup(rulesLookup)).join("\n\n")
  }

export const formatMatchesPage =
  (rules: ReadonlyArray<Rule>) =>
  (page: MatchesPage): string => {
    if (page.matches.length === 0) {
      return `No matches to display at offset ${page.startIndex - 1} (${page.totalCount} matches total).`
    }

    const isCompletePage = page.matches.length === page.totalCount

    if (isCompletePage) {
      return formatMatches(rules)(page.matches)
    }

    const hasMoreMatches = page.endIndex < page.totalCount
    const pageSummary = hasMoreMatches
      ? `${formatPageRange(page)} Use --offset ${page.endIndex} to see the next page.`
      : formatPageRange(page)

    return `${formatMatches(rules)(page.matches)}\n\n${pageSummary}`
  }

export const formatMatchesPageJson =
  (rules: ReadonlyArray<Rule>) =>
  (page: MatchesPage): string => {
    const groups = matchGroups(page.matches)
    const rulesLookup = rulesById(rules)
    const reportGroups = Array.map(groups, ruleReport(rulesLookup))
    const report = new MatchesReport({
      totalCount: page.totalCount,
      startIndex: page.startIndex,
      endIndex: page.endIndex,
      groups: reportGroups
    })

    return JSON.stringify(report, null, 2)
  }

const formatPageRange = (page: MatchesPage): string =>
  `Showing matches ${page.startIndex}-${page.endIndex} of ${page.totalCount}.`
