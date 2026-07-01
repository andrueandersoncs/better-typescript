#!/usr/bin/env node
import { Command, Options } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect, HashMap, Option, Schema, flow, pipe } from "effect"
import {
  formatMatchesPage,
  formatMatchesPageJson
} from "./output/formatMatches.js"
import { formatRulesGuide, formatRulesJson } from "./output/formatRulesGuide.js"
import { paginateMatches } from "./output/paginateMatches.js"
import { loadProject } from "./project/loadProject.js"
import type { LoadedProject } from "./project/loadProject.js"
import { rules } from "./rules/index.js"
import type { RuleMatch } from "./rules/index.js"
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

interface AnalyzeOptions {
  readonly project: string
  readonly limit: Option.Option<number>
  readonly offset: number
  readonly format: OutputFormat
}

const checkProject = (loadedProject: LoadedProject): ReadonlyArray<RuleMatch> =>
  runRules(rules)(loadedProject)

const setFailureExitCode = (): number => {
  process.exitCode = 1

  return process.exitCode
}

const analyzeProject = Effect.fn("analyzeProject")(function* (
  options: AnalyzeOptions
) {
  const workspace = yield* loadProject(options.project)
  const projectMatches = workspace.projects.flatMap(checkProject)
  const entries = projectMatches.map(matchEntry)
  const matches = pipe(HashMap.fromIterable(entries), HashMap.toValues)
  const isJsonFormat = options.format === "json"

  if (matches.length === 0) {
    const noLimit = Option.none<number>()
    const emptyPage = paginateMatches(0)(noLimit)([])

    return isJsonFormat
      ? formatMatchesPageJson(rules)(emptyPage)
      : `No rule matches found in ${workspace.rootPath}.`
  }

  yield* Effect.sync(setFailureExitCode)
  const page = paginateMatches(options.offset)(options.limit)(matches)

  return isJsonFormat
    ? formatMatchesPageJson(rules)(page)
    : formatMatchesPage(rules)(page)
})

const matchEntry = (match: RuleMatch): readonly [string, RuleMatch] => [
  [match.ruleId, match.fileName, match.line, match.column, match.message].join(
    ":"
  ),
  match
]

const reportError = Effect.fn("reportError")(function* (error: Error) {
  yield* Console.error(`Error: ${error.message}`)
  yield* Effect.sync(setFailureExitCode)
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
  { project, limit, offset, format },
  flow(runCommand, Effect.catchAll(reportError))
)

const command = pipe(rootCommand, Command.withSubcommands([rulesGuideCommand]))

const cli = Command.run(command, {
  name: "Better TypeScript",
  version: "0.0.0"
})

pipe(cli(process.argv), Effect.provide(NodeContext.layer), NodeRuntime.runMain)
