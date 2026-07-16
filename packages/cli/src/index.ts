#!/usr/bin/env node
import * as path from "node:path"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { Console, Effect, Function, Option, Predicate, Stream, Struct, pipe } from "effect"
import { Command, Flag } from "effect/unstable/cli"
import { renderEventText } from "@better-typescript/core/engine/report"
import type { ReportEvent } from "@better-typescript/core/engine/report/data"
import { reportEvents, workspaceUpdates } from "@better-typescript/core/engine/watch"
import { defaultConfig } from "@better-typescript/checks/preset/defaultWiring"
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
  Flag.withDescription("Continue watching for changes after the initial report.")
)

const setErrorExitCode = (): number => {
  process.exitCode = 2

  return process.exitCode
}

// Failures narrow structurally because this untyped boundary must not name the built-in type.
const isMessageCarrier = (cause: unknown): cause is { readonly message: string } =>
  Predicate.hasProperty(cause, "message") && Predicate.isString(cause.message)

const hasText = (value: string): boolean => value.length > 0

// Render unknown failures ourselves because config wiring reports errors with an unknown type.
const errorText = (error: unknown): string => {
  const fallbackText = String(error)

  return pipe(
    Option.liftPredicate(isMessageCarrier)(error),
    Option.map(Struct.get("message")),
    Option.filter(hasText),
    Option.getOrElse(Function.constant(fallbackText))
  )
}

const reportError = Effect.fn("reportError")(function* (error: unknown) {
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

// Send status lines to stderr because stdout remains a pure event stream for capture.
const runCommand = Effect.fn("runCommand")(function* (
  projectPath: string,
  prettyOutput: boolean,
  watchForChanges: boolean
) {
  const projectDirectory = path.resolve(projectPath)
  const config = yield* loadWiringConfig(projectDirectory, defaultConfig)
  const prettyOption = Option.liftPredicate(Boolean)(prettyOutput)

  const printEvent = Option.match(prettyOption, {
    onNone: Function.constant(printJsonEvent),
    onSome: Function.constant(printPrettyEvent)
  })

  const workspace = yield* discoverWorkspace(projectDirectory)
  const watchOptions = Option.none()
  const updates = workspaceUpdates(workspace, watchOptions)
  const selectedUpdates = watchForChanges ? updates : Stream.take(updates, 1)
  const events = reportEvents(config)(selectedUpdates)

  const status = watchForChanges
    ? `Watching ${workspace.rootPath} for changes.`
    : `Analyzing ${workspace.rootPath}.`

  yield* Console.error(status)
  yield* Stream.runForEach(events, printEvent)
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
