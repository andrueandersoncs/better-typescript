#!/usr/bin/env bun
import * as path from "node:path"
import * as BunRuntime from "@effect/platform-bun/BunRuntime"
import * as BunServices from "@effect/platform-bun/BunServices"
import { Array, Console, Effect, Function, HashSet, Option, Struct, flow, pipe } from "effect"
import { Command, Flag } from "effect/unstable/cli"
import { defaultConfig } from "@better-typescript/core/config"
import type { Rule, Violation } from "@better-typescript/core/linter"
import { runAnalysis } from "@better-typescript/core/analysis"
import { builtinRules } from "@better-typescript/rules/builtinRules"
import { reportError } from "./reportError.js"

const workingDirectory = process.cwd()
const project = pipe(Flag.directory("project"), Flag.withDefault(workingDirectory))

const fileGlob = pipe(
  Flag.string("glob"),
  Flag.withMetavar("GLOB"),
  Flag.withDescription("Analyze only files matching this project-relative glob."),
  Flag.optional
)

const ruleName = Struct.get<Rule, "name">("name")
const builtinRuleNames = Array.map(builtinRules, ruleName)

const rules = pipe(
  Flag.choice("rule", builtinRuleNames),
  Flag.withMetavar("RULE"),
  Flag.withDescription(
    "Check only this built-in rule. Repeat to select more rules. Ignores project config."
  ),
  Flag.atMost(Number.MAX_SAFE_INTEGER)
)

const pretty = pipe(
  Flag.boolean("pretty"),
  Flag.withDescription("Render human-readable violations instead of NDJSON.")
)

const printJsonViolation: (violation: Violation) => Effect.Effect<void> = flow(
  JSON.stringify,
  Console.log
)

const printPrettyViolation = (violation: Violation): Effect.Effect<void> =>
  Console.log(
    `${violation.filePath}:${violation.line}:${violation.column} ${violation.level} ${violation.ruleName} ${violation.message}`
  )

const selectedRules = (ruleNames: ReadonlyArray<string>) => {
  const names = HashSet.fromIterable(ruleNames)
  const isSelected = (rule: Rule) => HashSet.has(names, rule.name)

  return Array.filter(builtinRules, isSelected)
}

const runConfiguredAnalysis = (glob: Option.Option<string>) => (projectPath: string) =>
  Option.match(glob, {
    onNone: () => runAnalysis({ projectPath, rules: builtinRules }),
    onSome: (fileGlob) => runAnalysis({ projectPath, rules: builtinRules, fileGlob })
  })

const runSelectedAnalysis =
  (glob: Option.Option<string>) => (ruleNames: ReadonlyArray<string>) => (projectPath: string) => {
    const selected = selectedRules(ruleNames)

    return Option.match(glob, {
      onNone: () => runAnalysis({ projectPath, rules: selected, config: defaultConfig }),
      onSome: (fileGlob) =>
        runAnalysis({ projectPath, rules: selected, fileGlob, config: defaultConfig })
    })
  }

const runCommand = Effect.fn("Cli.runCommand")(function* (
  projectPath: string,
  prettyOutput: boolean,
  glob: Option.Option<string>,
  ruleNames: ReadonlyArray<string>
) {
  const projectDirectory = path.resolve(projectPath)

  yield* Console.error(`Analyzing ${projectDirectory}.`)

  const hasSelectedRules = ruleNames.length > 0

  const analysis = yield* hasSelectedRules
    ? runSelectedAnalysis(glob)(ruleNames)(projectDirectory)
    : runConfiguredAnalysis(glob)(projectDirectory)

  const prettyOption = Option.liftPredicate(Boolean)(prettyOutput)

  const printViolation = Option.match(prettyOption, {
    onNone: Function.constant(printJsonViolation),
    onSome: Function.constant(printPrettyViolation)
  })

  yield* Effect.forEach(analysis.violations, printViolation, { discard: true })
})

const rootCommand = Command.make(
  "better-typescript",
  { project, glob: fileGlob, rule: rules, pretty },
  ({ project: projectPath, glob, rule: ruleNames, pretty: prettyOutput }) =>
    pipe(runCommand(projectPath, prettyOutput, glob, ruleNames), Effect.catch(reportError))
)

pipe(
  Command.run(rootCommand, { version: "0.0.4" }),
  Effect.provide(BunServices.layer),
  BunRuntime.runMain
)
