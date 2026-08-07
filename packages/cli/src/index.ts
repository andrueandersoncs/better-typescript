#!/usr/bin/env bun
import * as path from "node:path"
import * as BunRuntime from "@effect/platform-bun/BunRuntime"
import * as BunServices from "@effect/platform-bun/BunServices"
import { Console, Effect, Function, Option, pipe } from "effect"
import { Command, Flag } from "effect/unstable/cli"
import { renderEventText } from "@better-typescript/core/engine/report/renderEventText"
import { type ReportEvent } from "@better-typescript/core/engine/report/reportEvent"
import { reportEvents } from "@better-typescript/core/engine/reportPipeline"
import { watchWorkspace } from "@better-typescript/core/engine/watch/watch"
import { workspacePrograms } from "@better-typescript/core/engine/watch/workspacePrograms"
import { defaultConfig } from "@better-typescript/guidance/preset/defaultWiring"
import { compilerOptionsForConfig } from "@better-typescript/core/engine/wiring/compilerOptionsForConfig"
import { loadWiringConfig } from "@better-typescript/core/project/loadWiringConfig"
import { discoverWorkspace } from "@better-typescript/core/project/loadProject"
import { reportError } from "./reportError.js"

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
  Effect.provide(BunServices.layer),
  BunRuntime.runMain
)
