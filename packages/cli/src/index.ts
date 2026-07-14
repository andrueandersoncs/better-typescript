#!/usr/bin/env node
import * as path from "node:path"
import { Command, Options } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect, Function, Option, Stream, flow, pipe } from "effect"
import {
  reportEventsFromWorkspaceConfigs,
  renderEventText,
  watchReportFromWiring
} from "@better-typescript/core/engine/watch"
import type { ReportEvent } from "@better-typescript/core/engine/watch/data"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import { discoverWorkspace } from "@better-typescript/core/project/loadProject"
import { loadWiring } from "@better-typescript/core/project/loadWiring"

const workingDirectory = process.cwd()

const project = pipe(
  Options.directory("project"),
  Options.withDefault(workingDirectory)
)

const pretty = pipe(
  Options.boolean("pretty"),
  Options.withDescription(
    "Render human-readable text blocks instead of NDJSON events."
  )
)

const watch = pipe(
  Options.boolean("watch"),
  Options.withDescription(
    "Continue watching for changes after the initial report."
  )
)

const setErrorExitCode = (): number => {
  process.exitCode = 2

  return process.exitCode
}

const reportError = Effect.fn("reportError")(function* (error: Error) {
  yield* Console.error(`Error: ${error.message}`)
  yield* Effect.sync(setErrorExitCode)
})

const printJsonEvent = (event: ReportEvent): Effect.Effect<void> =>
  pipe(JSON.stringify(event), Console.log)

const printPrettyEvent = (event: ReportEvent): Effect.Effect<void> => {
  const text = renderEventText(event)

  return Console.log(`${text}\n`)
}

// Send status lines to stderr because stdout remains a pure event stream for capture.
const runCommand = Effect.fn("runCommand")(function* (
  projectPath: string,
  prettyOutput: boolean,
  watchForChanges: boolean
) {
  const projectDirectory = path.resolve(projectPath)
  const wiring = yield* loadWiring(projectDirectory, defaultWiring)
  const prettyOption = Option.liftPredicate(Boolean)(prettyOutput)

  const printEvent = Option.match(prettyOption, {
    onNone: Function.constant(printJsonEvent),
    onSome: Function.constant(printPrettyEvent)
  })

  const oneShot = Effect.gen(function* () {
    const workspace = yield* discoverWorkspace(projectDirectory)
    const events = reportEventsFromWorkspaceConfigs(wiring)(workspace)

    yield* Console.error(`Analyzing ${workspace.rootPath}.`)
    yield* Stream.runForEach(events, printEvent)
  })

  const watched = Effect.gen(function* () {
    const workspace = yield* discoverWorkspace(projectDirectory)
    const watchOptions = Option.none()
    const events = watchReportFromWiring(wiring)(workspace, watchOptions)

    yield* Console.error(`Watching ${workspace.rootPath} for changes.`)
    yield* Stream.runForEach(events, printEvent)
  })

  const watchMode = Option.liftPredicate(Boolean)(watchForChanges)

  yield* Option.match(watchMode, {
    onNone: Function.constant(oneShot),
    onSome: Function.constant(watched)
  })
})

const rootCommand = Command.make(
  "better-typescript",
  { project, pretty, watch },
  ({ project: projectPath, pretty: prettyOutput, watch: watchForChanges }) =>
    pipe(
      runCommand(projectPath, prettyOutput, watchForChanges),
      Effect.catchAll(reportError)
    )
)

const command = rootCommand

const cli = Command.run(command, {
  name: "Better TypeScript",
  version: "0.0.0"
})

pipe(cli(process.argv), Effect.provide(NodeContext.layer), NodeRuntime.runMain)
