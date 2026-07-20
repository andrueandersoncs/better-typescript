#!/usr/bin/env node
import * as path from "node:path"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { Console, Effect, Function, Option, Predicate, Struct, pipe } from "effect"
import { Command, Flag } from "effect/unstable/cli"
import { renderEventText } from "@better-typescript/core/engine/report"
import type { ReportEvent } from "@better-typescript/core/engine/report/data"
import { reportEvents, watchWorkspace } from "@better-typescript/core/engine/watch"
import { workspacePrograms } from "@better-typescript/core/engine/workspacePrograms"
import { defaultConfig } from "@better-typescript/checks/preset/defaultWiring"
import { compilerOptionsForConfig } from "@better-typescript/core/engine/wiring"
import { loadWiringConfig } from "@better-typescript/core/project/loadWiringConfig"
import { discoverWorkspace } from "@better-typescript/core/project/loadProject"

const workingDirectory = process.cwd()

const project = pipe(Flag.directory("project"), Flag.withDefault(workingDirectory))

const pretty = pipe(
  Flag.boolean("pretty"),
  Flag.withDescription("Render human-readable text blocks instead of NDJSON events.")
)

const watch = pipe(
  Flag.boolean("watch"),
  Flag.withDescription("Continue rerunning the complete report after project changes.")
)

const setErrorExitCode = () => {
  process.exitCode = 2

  return process.exitCode
}

// Failures narrow structurally because this untyped boundary must not name the built-in type.
const isMessageCarrier = (cause: unknown): cause is { readonly message: string } =>
  Predicate.hasProperty(cause, "message") && Predicate.isString(cause.message)

const hasText = (value: string) => value.length > 0

// Render unknown failures ourselves because config wiring reports errors with an unknown type.
const errorText = (error: unknown) => {
  const fallbackText = String(error)

  return pipe(
    Option.liftPredicate(isMessageCarrier)(error),
    Option.map(Struct.get("message")),
    Option.filter(hasText),
    Option.getOrElse(Function.constant(fallbackText))
  )
}

const reportError = Effect.fn("Cli.reportError")(function* (error: unknown) {
  const text = errorText(error)

  yield* Console.error(`Error: ${text}`)
  yield* Effect.sync(setErrorExitCode)
})

const printJsonEvent = (event: ReportEvent): Effect.Effect<void> =>
  pipe(JSON.stringify(event), Console.log)

const printPrettyEvent = (event: ReportEvent): Effect.Effect<void> => {
  const text = renderEventText(event)

  return Console.log(`${text}\n`)
}

const runOneShot = Effect.fn("Cli.runOneShot")(function* (
  projectDirectory: string,
  printEvent: (event: ReportEvent) => Effect.Effect<void>
) {
  const config = yield* loadWiringConfig(projectDirectory, defaultConfig)
  const compilerOptions = compilerOptionsForConfig(config)
  const workspace = yield* discoverWorkspace(projectDirectory)

  const reportRun = Effect.gen(function* () {
    const update = yield* workspacePrograms.materialize(workspace, compilerOptions)
    const events = yield* reportEvents(config)(update)

    yield* Effect.forEach(events, printEvent, { discard: true })

    return workspace.rootPath
  })

  return yield* Effect.scoped(reportRun)
})

// A changed snapshot reruns from scratch because each wait owns its watcher.
const runCommand = Effect.fn("Cli.runCommand")(function* (
  projectPath: string,
  prettyOutput: boolean,
  watchForChanges: boolean
) {
  const projectDirectory = path.resolve(projectPath)
  const prettyOption = Option.liftPredicate(Boolean)(prettyOutput)

  const printEvent = Option.match(prettyOption, {
    onNone: Function.constant(printJsonEvent),
    onSome: Function.constant(printPrettyEvent)
  })

  const workspace = yield* discoverWorkspace(projectDirectory)

  const status = watchForChanges
    ? `Watching ${workspace.rootPath} for changes.`
    : `Analyzing ${workspace.rootPath}.`

  yield* Console.error(status)

  if (!watchForChanges) {
    yield* runOneShot(projectDirectory, printEvent)
    return
  }

  yield* runOneShot(projectDirectory, printEvent)

  const rerunReport = runOneShot(projectDirectory, printEvent)

  const rerun = pipe(
    watchWorkspace(projectDirectory),
    Effect.andThen(rerunReport),
    Effect.catch(reportError)
  )

  yield* Effect.forever(rerun)
})

const rootCommand = Command.make(
  "better-typescript",
  { project, pretty, watch },
  ({ project: projectPath, pretty: prettyOutput, watch: watchForChanges }) =>
    pipe(runCommand(projectPath, prettyOutput, watchForChanges), Effect.catch(reportError))
)

pipe(
  Command.run(rootCommand, {
    version: "0.0.0"
  }),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain
)
