#!/usr/bin/env node
import { Command, Options } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect, Option, Stream, flow, pipe } from "effect"
import { renderEventText, watchReport } from "./detectors/watch.js"
import type { ReportEvent } from "./detectors/watch.js"
import { discoverWorkspace } from "./project/loadProject.js"

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

interface WatchCommandOptions {
  readonly project: string
  readonly pretty: boolean
}

const setErrorExitCode = (): number => {
  process.exitCode = 2

  return process.exitCode
}

const reportError = Effect.fn("reportError")(function* (error: Error) {
  yield* Console.error(`Error: ${error.message}`)
  yield* Effect.sync(setErrorExitCode)
})

const printJsonEvent = (event: ReportEvent): Effect.Effect<void> => {
  const line = JSON.stringify(event)

  return Console.log(line)
}

const printPrettyEvent = (event: ReportEvent): Effect.Effect<void> => {
  const text = renderEventText(event)

  return Console.log(`${text}\n`)
}

// Status lines go to stderr; stdout stays a pure event stream (tee it to capture).
const runCommand = Effect.fn("runCommand")(function* (
  options: WatchCommandOptions
) {
  const workspace = yield* discoverWorkspace(options.project)
  const watchOptions = Option.none()
  const events = watchReport(workspace, watchOptions)
  const printEvent = options.pretty ? printPrettyEvent : printJsonEvent

  yield* Console.error(`Watching ${workspace.rootPath} for changes.`)
  yield* Stream.runForEach(events, printEvent)
})

const rootCommand = Command.make(
  "better-typescript",
  { project, pretty },
  flow(runCommand, Effect.catchAll(reportError))
)

const command = rootCommand

const cli = Command.run(command, {
  name: "Better TypeScript",
  version: "0.0.0"
})

pipe(cli(process.argv), Effect.provide(NodeContext.layer), NodeRuntime.runMain)
