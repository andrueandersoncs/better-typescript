import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { Effect, Stream } from "effect"
import { Bench } from "tinybench"
import type { Statistics, Task } from "tinybench"
import { reportFromWiring } from "../src/detectors/report.js"
import { defaultWiring } from "../src/preset/defaultWiring.js"
import { loadProject } from "../src/project/loadProject.js"

const benchDir = path.dirname(fileURLToPath(import.meta.url))
const cliArguments = process.argv.slice(2)
const targetPath =
  cliArguments.find((argument) => !argument.startsWith("--")) ??
  path.join(benchDir, "fixtures")

console.log(`Loading project: ${targetPath}`)
const workspace = await Effect.runPromise(loadProject(targetPath))

const collectReport = () =>
  Effect.runPromise(Stream.runCollect(reportFromWiring(defaultWiring)(workspace)))

const warmed = await collectReport()
const bench = new Bench({ time: 1000 })

bench.add("report", collectReport)

await bench.run()

interface TaskStatistics {
  readonly latency: Statistics
  readonly throughput: Statistics
}

const taskStatistics = (task: Task | undefined): TaskStatistics | null =>
  task?.result !== undefined && "latency" in task.result ? task.result : null

const meanLatencyMs = (taskName: string): number =>
  taskStatistics(bench.getTask(taskName))?.latency.mean ?? 0

console.log(`\nProject: ${workspace.rootPath}`)
console.log(`Projects loaded: ${workspace.projects.length}`)
console.log(`Blocks emitted in warm pass: ${Array.from(warmed).length}`)
console.table(
  bench.tasks.map((task) => ({
    task: task.name,
    "mean (ms/pass)": meanLatencyMs(task.name).toFixed(3),
    margin: `±${(taskStatistics(task)?.latency.rme ?? 0).toFixed(2)}%`,
    "ops/sec": Math.round(
      taskStatistics(task)?.throughput.mean ?? 0
    ).toLocaleString("en-US")
  }))
)
