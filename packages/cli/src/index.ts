#!/usr/bin/env bun
import * as path from "node:path"
import * as BunRuntime from "@effect/platform-bun/BunRuntime"
import * as BunServices from "@effect/platform-bun/BunServices"
import { Console, Effect, Function, Option, flow, pipe } from "effect"
import { Command, Flag } from "effect/unstable/cli"
import type { Violation } from "@better-typescript/core/linter"
import { runAnalysis } from "@better-typescript/core/analysis"
import { builtinRules } from "@better-typescript/rules/builtinRules"
import { reportError } from "./reportError.js"

const workingDirectory = process.cwd()
const project = pipe(Flag.directory("project"), Flag.withDefault(workingDirectory))

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

const runCommand = Effect.fn("Cli.runCommand")(function* (
  projectPath: string,
  prettyOutput: boolean
) {
  const projectDirectory = path.resolve(projectPath)

  yield* Console.error(`Analyzing ${projectDirectory}.`)

  const analysis = yield* runAnalysis({ projectPath: projectDirectory, rules: builtinRules })
  const prettyOption = Option.liftPredicate(Boolean)(prettyOutput)

  const printViolation = Option.match(prettyOption, {
    onNone: Function.constant(printJsonViolation),
    onSome: Function.constant(printPrettyViolation)
  })

  yield* Effect.forEach(analysis.violations, printViolation, { discard: true })
})

const rootCommand = Command.make(
  "better-typescript",
  { project, pretty },
  ({ project: projectPath, pretty: prettyOutput }) =>
    pipe(runCommand(projectPath, prettyOutput), Effect.catch(reportError))
)

pipe(
  Command.run(rootCommand, { version: "0.0.3" }),
  Effect.provide(BunServices.layer),
  BunRuntime.runMain
)
