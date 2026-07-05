import {
  Array,
  Function,
  HashMap,
  Option,
  Record,
  Schema,
  Struct,
  pipe
} from "effect"
import { Interpretation } from "../syndromes/index.js"
import { ExampleSnippet, Finding } from "../rules/index.js"
import type { EvidenceItem } from "../rules/types.js"
import type { Rule } from "../rules/index.js"
import type { MatchesPage } from "./paginateMatches.js"

const groupMatchesSchema = Schema.Array(Finding)

class MatchGroup extends Schema.Class<MatchGroup>("MatchGroup")({
  ruleId: Schema.String,
  hint: Schema.String,
  matches: groupMatchesSchema
}) {}

class MatchLocation extends Schema.Class<MatchLocation>("MatchLocation")({
  path: Schema.String,
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
const adviceSchema = Schema.Array(Finding)

// signals stays empty unless --signals opts in: signal-role matches are measurements for the interpreter, and an agent reading the default report should see only actionable findings and advice (see adrs/0004-opt-in-signal-visibility.md).
class MatchesReport extends Schema.Class<MatchesReport>("MatchesReport")({
  totalCount: Schema.Int,
  startIndex: Schema.Int,
  endIndex: Schema.Int,
  advice: adviceSchema,
  groups: ruleReportsSchema,
  signals: ruleReportsSchema
}) {}

type RulesById = HashMap.HashMap<string, Rule>

const newGroup = (match: Finding) => (): MatchGroup =>
  new MatchGroup({
    ruleId: match.detectorId,
    hint: match.hint,
    matches: [match]
  })

const appendMatch =
  (match: Finding) =>
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
  match: Finding
): HashMap.HashMap<string, MatchGroup> => {
  const key = `${match.detectorId}\n${match.hint}`
  const group = pipe(
    HashMap.get(groups, key),
    Option.map(appendMatch(match)),
    Option.getOrElse(newGroup(match))
  )

  return HashMap.set(groups, key, group)
}

const matchGroups = (
  matches: ReadonlyArray<Finding>
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

const formatLocation = (match: Finding): string =>
  `  ${match.path}:${match.line}:${match.column}`

// --- advice rendering and evidence collapse ---

type ConsumedLookup = HashMap.HashMap<string, string>

const noConsumed: ConsumedLookup = HashMap.empty()

const consumedKey =
  (fileName: string) =>
  (ruleId: string): string =>
    `${fileName}\u0000${ruleId}`

const evidenceMeasure: (item: EvidenceItem) => string = Struct.get("measure")

// Evidence measures are detector ids or detectorId/facet keys; the segment before the slash names the rule whose matches the advice consumed.
const measureRuleId = (measure: string): string => {
  const separatorIndex = measure.indexOf("/")

  return separatorIndex === -1 ? measure : measure.slice(0, separatorIndex)
}

const consumedEntries = (
  advice: Finding
): ReadonlyArray<readonly [string, string]> => {
  if (advice.level !== "file") {
    return []
  }

  const measures = advice.evidence.map(evidenceMeasure)
  const ruleIds = measures.map(measureRuleId)
  const distinct = Array.dedupe(ruleIds)

  return distinct.map(consumedEntry(advice))
}

const consumedEntry =
  (advice: Finding) =>
  (ruleId: string): readonly [string, string] => {
    const key = consumedKey(advice.path)(ruleId)

    return [key, advice.detectorId]
  }

const consumingSyndrome =
  (consumed: ConsumedLookup) =>
  (match: Finding): Option.Option<string> => {
    const key = consumedKey(match.path)(match.detectorId)

    return HashMap.get(consumed, key)
  }

const matchFileName: (match: Finding) => string = Struct.get("path")

const collapsedLine =
  (consumed: ConsumedLookup) =>
  (entry: readonly [string, ReadonlyArray<Finding>]): string => {
    const first = entry[1][0]
    const syndromeId = pipe(
      Option.fromNullable(first),
      Option.flatMap(consumingSyndrome(consumed)),
      Option.getOrElse(emptyDescription)
    )

    return `  ${entry[0]}: ${entry[1].length} matches -> ${syndromeId}`
  }

const collapsedLines =
  (consumed: ConsumedLookup) =>
  (matches: ReadonlyArray<Finding>): ReadonlyArray<string> => {
    const byFile = Array.groupBy(matches, matchFileName)
    const entries = Record.toEntries(byFile)

    return entries.map(collapsedLine(consumed))
  }

const isConsumedMatch =
  (consumed: ConsumedLookup) =>
  (match: Finding): boolean =>
    pipe(consumingSyndrome(consumed)(match), Option.isSome)

const formatGroup =
  (rulesLookup: RulesById) =>
  (consumed: ConsumedLookup) =>
  (group: MatchGroup): string => {
    const heading = `${group.ruleId}\n  Hint: ${group.hint}`
    const partitioned = Array.partition(
      group.matches,
      isConsumedMatch(consumed)
    )
    const visible = partitioned[0]
    const collapsed = partitioned[1]
    const goodExamples = goodExamplesForRule(rulesLookup)(group.ruleId)
    const exampleSections =
      visible.length > 0 ? Array.map(goodExamples, formatGoodSnippet) : []
    const collapsedSections = collapsedLines(consumed)(collapsed)
    const locations = Array.map(visible, formatLocation)
    const sections = Array.flatten([
      [heading],
      exampleSections,
      collapsedSections,
      locations
    ])

    return Array.join(sections, "\n")
  }

const formatEvidenceItem = (item: EvidenceItem): string =>
  `${item.measure}: ${item.count}`

const formatAdvice = (advice: Finding): string => {
  const pathLabel = advice.level === "project" ? "project" : advice.path
  const evidence = advice.evidence.map(formatEvidenceItem).join(", ")

  return (
    `  ${pathLabel} [${advice.level}] — ${advice.message}\n` +
    `    evidence: ${evidence}\n` +
    `    fix: ${advice.hint}`
  )
}

const adviceHeading =
  "Advice — cross-rule findings; fix the shape, not each match:"

const matchLocation = (match: Finding): MatchLocation =>
  new MatchLocation({
    path: match.path,
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
  (matches: ReadonlyArray<Finding>): string => {
    const groups = matchGroups(matches)
    const rulesLookup = rulesById(rules)
    const format = formatGroup(rulesLookup)(noConsumed)

    return Array.map(groups, format).join("\n\n")
  }

export const formatMatchesPage =
  (rules: ReadonlyArray<Rule>) =>
  (interpretation: Interpretation) =>
  (detail: boolean) =>
  (page: MatchesPage): string => {
    if (page.matches.length === 0) {
      return `No matches to display at offset ${page.startIndex - 1} (${page.totalCount} matches total).`
    }

    const isCompletePage = page.matches.length === page.totalCount
    const hasMoreMatches = page.endIndex < page.totalCount
    const pageSummary = hasMoreMatches
      ? `${formatPageRange(page)} Use --offset ${page.endIndex} to see the next page.`
      : formatPageRange(page)
    const summarySections = isCompletePage ? [] : [pageSummary]
    const advice = interpretation.advice
    // Only file-level advice collapses matches: directory and project findings describe campaigns, and hiding their raw locations would bury the work they name.
    const consumedPairs = advice.flatMap(consumedEntries)
    const collapseLookup = HashMap.fromIterable(consumedPairs)
    const consumed = detail ? noConsumed : collapseLookup
    const groups = matchGroups(page.matches)
    const rulesLookup = rulesById(rules)
    const format = formatGroup(rulesLookup)(consumed)
    const groupsText = Array.map(groups, format).join("\n\n")
    const adviceBody = advice.map(formatAdvice).join("\n")
    const adviceSections =
      advice.length > 0 ? [`${adviceHeading}\n${adviceBody}`] : []
    const sections = Array.flatten([
      adviceSections,
      [groupsText],
      summarySections
    ])

    return Array.join(sections, "\n\n")
  }

export const formatMatchesPageJson =
  (rules: ReadonlyArray<Rule>) =>
  (interpretation: Interpretation) =>
  (signalMatches: ReadonlyArray<Finding>) =>
  (page: MatchesPage): string => {
    const groups = matchGroups(page.matches)
    const rulesLookup = rulesById(rules)
    const reportGroups = Array.map(groups, ruleReport(rulesLookup))
    const signalGroups = matchGroups(signalMatches)
    const reportSignals = Array.map(signalGroups, ruleReport(rulesLookup))
    const report = new MatchesReport({
      totalCount: page.totalCount,
      startIndex: page.startIndex,
      endIndex: page.endIndex,
      advice: interpretation.advice,
      groups: reportGroups,
      signals: reportSignals
    })

    return JSON.stringify(report, null, 2)
  }

const formatPageRange = (page: MatchesPage): string =>
  `Showing matches ${page.startIndex}-${page.endIndex} of ${page.totalCount}.`
