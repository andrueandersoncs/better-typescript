import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { runSelfHostBenchmark, selfHostBenchmarkTarget } from "./selfHostBenchmark.js"

const benchDirectory = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.dirname(benchDirectory)
const repetitions = Number(process.env.BETTER_TYPESCRIPT_SELF_HOST_RUNS ?? "3")
const target = await selfHostBenchmarkTarget(rootPath)

console.log(`Self-hosting ${target.rootPath}`)
console.log(`Built CLI: ${target.cliPath}`)
console.log(`Checks enrolled: ${target.checkNames.length}`)
console.log("Reported durations exclude build time.")

const report = await runSelfHostBenchmark(target, {
  repetitions,
  timeoutMs: 120_000
})

console.table(
  report.durationsMs.map((durationMs, index) => ({
    run: index + 1,
    "elapsed (s)": (durationMs / 1_000).toFixed(3)
  }))
)
console.log(
  JSON.stringify({
    benchmark: "self-host",
    checks: target.checkNames.length,
    runsMs: report.durationsMs,
    minimumMs: report.minimumMs,
    medianMs: report.medianMs,
    maximumMs: report.maximumMs
  })
)
