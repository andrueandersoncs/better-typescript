import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { Effect, Result, Stream, pipe } from "effect"
import { Bench } from "tinybench"
import type { Statistics, Task } from "tinybench"
import {
  compilerOptionsForConfig,
  defineConfig,
  mergeWirings
} from "@better-typescript/core/engine/wiring"
import { makeReportEvents, workspacePrograms } from "@better-typescript/core/engine/watch"
import { contextFor } from "@better-typescript/core/engine/sources"
import { WorkspaceUpdate } from "@better-typescript/core/engine/watch/data"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import { architectureExploreWiring } from "@better-typescript/checks/preset/architectureExploreWiring"
import { discoverWorkspace, loadProject } from "@better-typescript/core/project/loadProject"
import type {
  LoadedProject,
  WorkspaceConfigs
} from "@better-typescript/core/project/loadProject/data"

const benchDir = path.dirname(fileURLToPath(import.meta.url))
const cliArguments = process.argv.slice(2)
const targetPath =
  cliArguments.find((argument) => !argument.startsWith("--")) ?? path.join(benchDir, "fixtures")
const maximumMeanLatencyMs = 100

const benchmarkWiring = mergeWirings([defaultWiring, architectureExploreWiring])

const benchmarkConfig = defineConfig([{ files: ["**/*"], wiring: benchmarkWiring }])
const benchmarkCompilerOptions = compilerOptionsForConfig(benchmarkConfig)

interface TaskStatistics {
  readonly latency: Statistics
  readonly throughput: Statistics
}

const taskStatistics = (task: Task | undefined): TaskStatistics | null =>
  task?.result !== undefined && "latency" in task.result ? task.result : null

const contextFromLoadedProject = (project: LoadedProject) =>
  contextFor(project.rootPath)(project.program)

const runLoadedBenchmark = async (): Promise<void> => {
  const workspace = await Effect.runPromise(loadProject(targetPath, benchmarkCompilerOptions))
  const report = await Effect.runPromise(makeReportEvents(benchmarkConfig))
  const collectReport = () => {
    const update = new WorkspaceUpdate({
      rootPath: workspace.rootPath,
      contexts: workspace.projects.map(contextFromLoadedProject)
    })
    const blocks = pipe(
      Stream.succeed(update),
      report,
      Stream.filterMap((event) =>
        event._tag === "signal" ? Result.succeed(event.text) : Result.failVoid
      )
    )

    return Effect.runPromise(Stream.runCollect(blocks))
  }

  const warmed = await collectReport()
  const bench = new Bench({ time: 1000 })

  bench.add("report", collectReport)

  await bench.run()

  const meanLatencyMs = (taskName: string): number =>
    taskStatistics(bench.getTask(taskName))?.latency.mean ?? 0
  const reportMeanLatencyMs = meanLatencyMs("report")

  console.log(`\nProject: ${workspace.rootPath}`)
  console.log(`Projects loaded: ${workspace.projects.length}`)
  console.log(`Blocks emitted in warm pass: ${Array.from(warmed).length}`)
  console.table(
    bench.tasks.map((task) => ({
      task: task.name,
      "mean (ms/pass)": meanLatencyMs(task.name).toFixed(3),
      margin: `±${(taskStatistics(task)?.latency.rme ?? 0).toFixed(2)}%`,
      "ops/sec": Math.round(taskStatistics(task)?.throughput.mean ?? 0).toLocaleString("en-US")
    }))
  )

  if (reportMeanLatencyMs > maximumMeanLatencyMs) {
    console.error(
      `Performance budget exceeded: ${reportMeanLatencyMs.toFixed(3)}ms > ${maximumMeanLatencyMs}ms`
    )
    process.exitCode = 1
  }
}

const runOneShotWorkspacePass = async (workspace: WorkspaceConfigs): Promise<void> => {
  const report = await Effect.runPromise(makeReportEvents(benchmarkConfig))
  const started = performance.now()
  const blocks = await Effect.runPromise(
    pipe(
      workspacePrograms(workspace, benchmarkCompilerOptions),
      report,
      Stream.filterMap((event) =>
        event._tag === "signal" ? Result.succeed(event.text) : Result.failVoid
      ),
      Stream.runCollect
    )
  )
  const elapsedMs = performance.now() - started

  console.log(`\nProject: ${workspace.rootPath}`)
  console.log(`Projects analyzed: ${workspace.projects.length}`)
  console.log(`Blocks emitted: ${Array.from(blocks).length}`)
  console.table([
    {
      task: "one-shot workspace report",
      "elapsed (ms/pass)": elapsedMs.toFixed(3)
    }
  ])
}

console.log(`Loading project: ${targetPath}`)
const workspace = await Effect.runPromise(discoverWorkspace(targetPath))

if (workspace.projects.length === 1) {
  await runLoadedBenchmark()
} else {
  await runOneShotWorkspacePass(workspace)
}
