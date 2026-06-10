// Per-rule performance benchmark, following the pattern used by the Effect repo
// (repos/effect/packages/effect/benchmark/*): tinybench tasks + console.table.
//
// Usage:
//   npm run bench                          benchmark every rule against bench/fixtures
//   npm run bench -- <path>                benchmark against another project (e.g. ".")
//   npm run bench -- --rule=no-throw       benchmark a single rule
//
// Methodology:
// - ts.createProgram() runs once in setup; it is project-load cost, not rule cost.
// - One task per rule; one iteration = rule.check() over every non-skipped source file.
// - An untimed pass first warms the TypeChecker caches and records match counts, so
//   timed iterations measure steady-state rule cost (first-resolution cost excluded).
// - "share" = this rule's mean divided by the sum of all per-rule means: where a full
//   lint pass spends its time. "ALL rules (runRules)" is the real runner end to end.
//
// Sample output (Apple Silicon, fixtures, 2026-06-10):
// ┌─────────┬────────────────────────────────────┬────────────────┬──────────┬─────────┬────────┬─────────┐
// │ (index) │ rule                               │ mean (ms/pass) │ margin   │ ops/sec │ share  │ matches │
// ├─────────┼────────────────────────────────────┼────────────────┼──────────┼─────────┼────────┼─────────┤
// │ 0       │ 'ALL rules (runRules)'             │ '1560.761'     │ '±0.26%' │ '1'     │ ''     │ ''      │
// │ 1       │ 'no-undefined'                     │ '138.372'      │ '±1.06%' │ '7'     │ '8.8%' │ 2       │
// │ 2       │ 'no-multiple-boolean-operators'    │ '99.194'       │ '±1.58%' │ '10'    │ '6.3%' │ 7       │
// │ ...     │ (most rules cluster at ~80ms — the nodeStream traversal floor)                     │ ...     │
// │ 19      │ 'no-duplicate-function-names'      │ '0.246'        │ '±1.74%' │ '4,561' │ '0.0%' │ 2       │
// └─────────┴────────────────────────────────────┴────────────────┴──────────┴─────────┴────────┴─────────┘
// Reading: every nodeStream-based rule pays ~80ms/pass over 3 small files regardless of
// what it checks, while the one rule that walks statements directly runs in 0.25ms —
// the per-node Effect Stream traversal dominates total lint time, not rule logic.

import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { Bench } from "tinybench"
import type { Statistics, Task } from "tinybench"
import { loadProject } from "../src/project/loadProject.js"
import { rules } from "../src/rules/index.js"
import type { Rule, RuleContext } from "../src/rules/index.js"
import { runRules, shouldSkipSourceFile } from "../src/runner/runRules.js"

const benchDir = path.dirname(fileURLToPath(import.meta.url))

const cliArguments = process.argv.slice(2)
const targetPath =
  cliArguments.find((argument) => !argument.startsWith("--")) ?? path.join(benchDir, "fixtures")
const ruleFilter = cliArguments
  .find((argument) => argument.startsWith("--rule="))
  ?.slice("--rule=".length)

const benchedRules: ReadonlyArray<Rule> = rules.filter(
  (rule) => ruleFilter === undefined || rule.id === ruleFilter
)

if (benchedRules.length === 0) {
  console.error(`No rule matches "${ruleFilter}". Available rules:`)
  console.error(rules.map((rule) => `  ${rule.id}`).join("\n"))
  process.exit(1)
}

console.log(`Loading project: ${targetPath}`)
const workspace = await Effect.runPromise(loadProject(targetPath))

// One RuleContext per (project, source file), built once: program and checker are
// shared across iterations exactly as they are in a real runRules() invocation.
const contexts: ReadonlyArray<RuleContext> = workspace.projects.flatMap((project) => {
  const checker = project.program.getTypeChecker()

  return project.program
    .getSourceFiles()
    .filter((sourceFile) => !shouldSkipSourceFile(sourceFile.fileName, sourceFile.isDeclarationFile))
    .map((sourceFile) => ({
      program: project.program,
      checker,
      projectRoot: project.rootPath,
      sourceFile
    }))
})

const checkAllFiles = (rule: Rule): number =>
  contexts.reduce((total, context) => total + rule.check(context).length, 0)

const matchCounts = new Map(benchedRules.map((rule) => [rule.id, checkAllFiles(rule)]))

const allRulesTask = "ALL rules (runRules)"
const bench = new Bench({ time: 1000 })

benchedRules.forEach((rule) => {
  bench.add(rule.id, () => {
    checkAllFiles(rule)
  })
})

if (benchedRules.length > 1) {
  bench.add(allRulesTask, () => {
    workspace.projects.forEach((project) => runRules(project, benchedRules))
  })
}

await bench.run()

interface TaskStatistics {
  readonly latency: Statistics
  readonly throughput: Statistics
}

const taskStatistics = (task: Task | undefined): TaskStatistics | null =>
  task?.result !== undefined && "latency" in task.result ? task.result : null

const meanLatencyMs = (taskName: string): number =>
  taskStatistics(bench.getTask(taskName))?.latency.mean ?? 0

const totalRuleTimeMs = benchedRules.reduce((total, rule) => total + meanLatencyMs(rule.id), 0)

const sortedTasks = [...bench.tasks].sort(
  (left, right) => meanLatencyMs(right.name) - meanLatencyMs(left.name)
)

console.log(`\nProject: ${workspace.rootPath}`)
console.log(`Source files checked per pass: ${contexts.length}`)
console.table(
  sortedTasks.map((task) => ({
    rule: task.name,
    "mean (ms/pass)": (taskStatistics(task)?.latency.mean ?? 0).toFixed(3),
    margin: `±${(taskStatistics(task)?.latency.rme ?? 0).toFixed(2)}%`,
    "ops/sec": Math.round(taskStatistics(task)?.throughput.mean ?? 0).toLocaleString("en-US"),
    share:
      task.name === allRulesTask
        ? ""
        : `${((meanLatencyMs(task.name) / totalRuleTimeMs) * 100).toFixed(1)}%`,
    matches: matchCounts.get(task.name) ?? ""
  }))
)
