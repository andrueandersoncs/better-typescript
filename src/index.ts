#!/usr/bin/env node
import { Command, Options } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import {
  Console,
  Effect,
  HashMap,
  HashSet,
  Option,
  Predicate,
  Schema,
  Struct,
  flow,
  pipe
} from "effect"
import { interpretMatches } from "./runner/interpretMatches.js"
import { syndromeRegistry } from "./syndromes/index.js"
import {
  formatMatchesPage,
  formatMatchesPageJson
} from "./output/formatMatches.js"
import { formatRulesGuide, formatRulesJson } from "./output/formatRulesGuide.js"
import { paginateMatches } from "./output/paginateMatches.js"
import { loadProject } from "./project/loadProject.js"
import type { LoadedProject } from "./project/loadProject.js"
import { isFindingRule, rules } from "./rules/index.js"
import type { Rule, Finding } from "./rules/index.js"
import { runRules } from "./runner/runRules.js"

const workingDirectory = process.cwd()

const project = pipe(
  Options.directory("project", { exists: "yes" }),
  Options.withDefault(workingDirectory)
)

const limit = pipe(
  Options.integer("limit"),
  Options.withSchema(Schema.Positive),
  Options.withDescription("Maximum number of rule matches to display."),
  Options.optional
)

const offset = pipe(
  Options.integer("offset"),
  Options.withSchema(Schema.NonNegative),
  Options.withDescription("Number of rule matches to skip before displaying."),
  Options.withDefault(0)
)

type OutputFormat = "text" | "json"

const format = pipe(
  Options.choice("format", ["text", "json"]),
  Options.withDescription(
    "Output format: human-readable text or machine-readable JSON."
  ),
  Options.withDefault("text")
)

const detail = pipe(
  Options.boolean("detail"),
  Options.withDescription(
    "List every match location, including matches collapsed under a diagnosis."
  ),
  Options.withDefault(false)
)

// Off by default: the JSON consumer is a coding agent, and signal matches are measurements for the interpreter, not actionable findings (see adrs/0004-opt-in-signal-visibility.md).
const signals = pipe(
  Options.boolean("signals"),
  Options.withDescription(
    "Include signal-rule matches in the JSON report's signals section. Signals are measurements consumed by advice, never violations: they never affect the exit code and never render in text output."
  ),
  Options.withDefault(false)
)

interface AnalyzeOptions {
  readonly project: string
  readonly limit: Option.Option<number>
  readonly offset: number
  readonly format: OutputFormat
  readonly detail: boolean
  readonly signals: boolean
}

const checkProject = (loadedProject: LoadedProject): ReadonlyArray<Finding> =>
  runRules(rules)(loadedProject)

const setFailureExitCode = (): number => {
  process.exitCode = 1

  return process.exitCode
}

// Exit 2 separates "the tool could not run" from "the tool found findings", so CI can tell a misconfiguration from a lint failure.
const setErrorExitCode = (): number => {
  process.exitCode = 2

  return process.exitCode
}

const ruleIdOf: (rule: Rule) => string = Struct.get("id")

const findingRules = rules.filter(isFindingRule)

const findingRuleIdList = findingRules.map(ruleIdOf)

const findingRuleIds = HashSet.fromIterable(findingRuleIdList)

const isFindingMatch = (match: Finding): boolean =>
  HashSet.has(findingRuleIds, match.detectorId)

// Every match the runner emits comes from a rule, so the complement of finding matches is exactly the signal-role matches.
const isSignalMatch = Predicate.not(isFindingMatch)

const interpret = interpretMatches(syndromeRegistry)(rules)

const analyzeProject = Effect.fn("analyzeProject")(function* (
  options: AnalyzeOptions
) {
  const workspace = yield* loadProject(options.project)
  const projectMatches = workspace.projects.flatMap(checkProject)
  const entries = projectMatches.map(matchEntry)
  const allMatches = pipe(HashMap.fromIterable(entries), HashMap.toValues)
  const interpretation = interpret(allMatches)
  const matches = allMatches.filter(isFindingMatch)
  const signalMatches = options.signals ? allMatches.filter(isSignalMatch) : []
  const isJsonFormat = options.format === "json"

  if (matches.length === 0) {
    const noLimit = Option.none<number>()
    const emptyPage = paginateMatches(0)(noLimit)([])

    return isJsonFormat
      ? formatMatchesPageJson(rules)(interpretation)(signalMatches)(emptyPage)
      : `No rule matches found in ${workspace.rootPath}.`
  }

  yield* Effect.sync(setFailureExitCode)
  const page = paginateMatches(options.offset)(options.limit)(matches)

  return isJsonFormat
    ? formatMatchesPageJson(rules)(interpretation)(signalMatches)(page)
    : formatMatchesPage(rules)(interpretation)(options.detail)(page)
})

// Finding identity carries no presentation text: the same detector at the same position is the same finding, whichever project of a solution workspace produced it (adrs/0003, stage one).
const matchEntry = (match: Finding): readonly [string, Finding] => [
  [match.detectorId, match.path, match.line, match.column].join(":"),
  match
]

const reportError = Effect.fn("reportError")(function* (error: Error) {
  yield* Console.error(`Error: ${error.message}`)
  yield* Effect.sync(setErrorExitCode)
})

const runCommand = Effect.fn("runCommand")(function* (options: AnalyzeOptions) {
  const output = yield* analyzeProject(options)
  yield* Console.log(output)
})

interface RulesGuideOptions {
  readonly format: OutputFormat
}

const runRulesGuideCommand = Effect.fn("runRulesGuideCommand")(function* (
  options: RulesGuideOptions
) {
  const isJsonFormat = options.format === "json"
  const output = isJsonFormat ? formatRulesJson(rules) : formatRulesGuide(rules)
  yield* Console.log(output)
})

const rulesGuideCommand = Command.make(
  "rules",
  { format },
  runRulesGuideCommand
)

const rootCommand = Command.make(
  "better-typescript",
  { project, limit, offset, format, detail, signals },
  flow(runCommand, Effect.catchAll(reportError))
)

const command = pipe(rootCommand, Command.withSubcommands([rulesGuideCommand]))

const cli = Command.run(command, {
  name: "Better TypeScript",
  version: "0.0.0"
})

pipe(cli(process.argv), Effect.provide(NodeContext.layer), NodeRuntime.runMain)
