#!/usr/bin/env node
import { Command, Options } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import {
  Chunk,
  Console,
  Effect,
  Option,
  Schema,
  Stream,
  flow,
  pipe
} from "effect"
import { paginateBlocks, renderPage, report } from "./detectors/report.js"
import { loadProject } from "./project/loadProject.js"

const workingDirectory = process.cwd()

const project = pipe(
  Options.directory("project"),
  Options.withDefault(workingDirectory)
)

const limit = pipe(
  Options.integer("limit"),
  Options.withSchema(Schema.Positive),
  Options.withDescription("Maximum number of signal blocks to display."),
  Options.optional
)

const offset = pipe(
  Options.integer("offset"),
  Options.withSchema(Schema.NonNegative),
  Options.withDescription("Number of signal blocks to skip before displaying."),
  Options.withDefault(0)
)

interface AnalyzeOptions {
  readonly project: string
  readonly limit: Option.Option<number>
  readonly offset: number
}

const setErrorExitCode = (): number => {
  process.exitCode = 2

  return process.exitCode
}

const analyzeProject = Effect.fn("analyzeProject")(function* (
  options: AnalyzeOptions
) {
  const workspace = yield* loadProject(options.project)
  const stream = report(workspace)
  const emitted = yield* Stream.runCollect(stream)
  const blocks = Chunk.toReadonlyArray(emitted)
  const isEmpty = blocks.length === 0
  const rendered = pipe(
    blocks,
    paginateBlocks(options.offset)(options.limit),
    renderPage
  )

  return isEmpty ? `No signals in ${workspace.rootPath}.` : rendered
})

const reportError = Effect.fn("reportError")(function* (error: Error) {
  yield* Console.error(`Error: ${error.message}`)
  yield* Effect.sync(setErrorExitCode)
})

const runCommand = Effect.fn("runCommand")(function* (options: AnalyzeOptions) {
  const output = yield* analyzeProject(options)
  yield* Console.log(output)
})

const rootCommand = Command.make(
  "better-typescript",
  { project, limit, offset },
  flow(runCommand, Effect.catchAll(reportError))
)

const command = rootCommand

const cli = Command.run(command, {
  name: "Better TypeScript",
  version: "0.0.0"
})

pipe(cli(process.argv), Effect.provide(NodeContext.layer), NodeRuntime.runMain)
