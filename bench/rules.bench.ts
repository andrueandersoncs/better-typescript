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
// - One task per rule: compileRules([rule]) interpreted over every non-skipped source
//   file (solo rules pay their own single-pass walk). "ALL rules (runRules)" is the
//   real runner: all rules fused into one dispatch table and one walk per file.
// - An untimed pass first warms the TypeChecker caches and records match counts, so
//   timed iterations measure steady-state rule cost (first-resolution cost excluded).
// - "share" = this rule's mean divided by the sum of all per-rule means: each rule's
//   relative weight. With fusion, solo means deliberately sum to MORE than the fused
//   all-rules time — the gap is the shared-traversal win.
//
// History (fixtures, Apple Silicon, 2026-06-10):
// - Stream-per-node traversal, one walk per rule:   ALL rules 1560.761 ms/pass,
//   typical rule ~80 ms (the traversal floor), no-undefined 138 ms.
// - RuleCheck algebra + compileRules single pass:   ALL rules 0.921 ms/pass (~1700x),
//   every rule 0.16-0.37 ms; solo sum 3.822 ms vs fused 0.921 ms = 4.1x fusion win.
// - no-inline-closures rule + whole-src migration to named/curried handlers
//   (2026-06-11, fixtures also conformed): ALL rules 0.473 ms/pass across 20 rules,
//   every rule 0.16-0.22 ms; solo sum 3.618 ms vs fused 0.473 ms = 7.6x fusion win.
// - prefer-effect-schema-constructor rule + Schema.Class construction for RuleMatch,
//   RuleContext, LoadedProject, and MatchesPage (2026-06-11, fixtures grew 2 cases):
//   ALL rules 0.657 ms/pass across 21 rules, every rule 0.18-0.24 ms; solo sum
//   4.255 ms vs fused 0.657 ms = 6.5x fusion win. The bump over 0.473 is the extra
//   rule, the larger fixture, and validated match construction.
// - prefer-effect-schema-class rule + Schema classes for Rule and the listeners
//   (2026-06-11): ALL rules 0.677 ms/pass across 22 rules, every rule 0.18-0.24 ms;
//   solo sum 4.435 ms vs fused 0.677 ms = 6.6x fusion win. The rule's program-wide
//   construction index is built once per program and cached, so its steady-state
//   cost (0.189 ms) is just the per-interface lookups.
// - no-nested-calls rule + whole-src linearization to named intermediates
//   (2026-06-11, clean.ts conformed, fixtures grew 1 case): ALL rules 0.756 ms/pass
//   across 23 rules, every rule 0.19-0.25 ms; solo sum 4.749 ms vs fused 0.756 ms =
//   6.3x fusion win. The rule's checker query (the function-returning exemption)
//   runs only for calls already sitting in a consuming argument position, so its
//   steady-state cost (0.217 ms) stays at the traversal floor.

import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { Bench } from "tinybench"
import type { Statistics, Task } from "tinybench"
import { loadProject } from "../src/project/loadProject.js"
import { RuleContext, rules } from "../src/rules/index.js"
import type { Rule, RuleMatch } from "../src/rules/index.js"
import { compileRules } from "../src/runner/compileRules.js"
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
    .map(
      (sourceFile) =>
        new RuleContext({
          program: project.program,
          checker,
          projectRoot: project.rootPath,
          sourceFile
        })
    )
})

interface SoloRule {
  readonly rule: Rule
  readonly checkSourceFile: (context: RuleContext) => ReadonlyArray<RuleMatch>
}

const soloRules: ReadonlyArray<SoloRule> = benchedRules.map((rule) => ({
  rule,
  checkSourceFile: compileRules([rule])
}))

const checkAllFiles = (solo: SoloRule): number =>
  contexts.reduce((total, context) => total + solo.checkSourceFile(context).length, 0)

const matchCounts = new Map(soloRules.map((solo) => [solo.rule.id, checkAllFiles(solo)]))

const allRulesTask = "ALL rules (runRules)"
const bench = new Bench({ time: 1000 })

soloRules.forEach((solo) => {
  bench.add(solo.rule.id, () => {
    checkAllFiles(solo)
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

if (benchedRules.length > 1) {
  const fusedMs = meanLatencyMs(allRulesTask)
  console.log(
    `Sum of solo rule means: ${totalRuleTimeMs.toFixed(3)} ms/pass; ` +
      `fused all-rules pass: ${fusedMs.toFixed(3)} ms/pass ` +
      `(${(totalRuleTimeMs / fusedMs).toFixed(1)}x shared-traversal win)`
  )
}
