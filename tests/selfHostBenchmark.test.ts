import * as assert from "node:assert/strict"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import selfHostConfig from "../better-typescript.config.js"
import { runSelfHostBenchmark, selfHostBenchmarkTarget } from "../bench/selfHostBenchmark.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.dirname(testDirectory)

test("self-host benchmark runs the built CLI with every enrolled Check", async () => {
  const target = await selfHostBenchmarkTarget(repoRoot)

  assert.equal(path.relative(repoRoot, target.cliPath), "packages/cli/dist/index.js")
  assert.equal(target.checkNames.length, 96)
  assert.ok(target.checkNames.includes("no-unused"))
  assert.ok(target.checkNames.includes("prefer-effectful-function"))
  assert.ok(target.checkNames.includes("prefer-inferred-types"))
  assert.ok(target.checkNames.includes("prefer-result-concept-names"))
  assert.ok(target.checkNames.includes("require-predicate-name-consistency"))
  assert.ok(target.checkNames.includes("require-construction-name-consistency"))
  assert.ok(target.checkNames.includes("require-lookup-totality-name-consistency"))
  assert.ok(target.checkNames.includes("require-result-cardinality-name-consistency"))
  assert.ok(target.checkNames.includes("require-result-shape-name-consistency"))
  assert.ok(target.checkNames.includes("require-conversion-direction-consistency"))
  assert.ok(target.checkNames.includes("require-command-name-consistency"))
  assert.ok(target.checkNames.includes("require-callable-role-name-consistency"))
  assert.ok(target.checkNames.includes("prefer-specific-operation-names"))
  assert.ok(target.checkNames.includes("functional-core-effect-boundaries"))
  assert.ok(target.checkNames.includes("composition-fingerprints"))
})

test("every self-host wiring covers every package source tree", () => {
  assert.equal(selfHostConfig.length, 3)
  assert.ok(
    selfHostConfig.every((entry) => entry.files.includes("packages/*/src/**")),
    "every self-host wiring must cover packages/checks, packages/core, and packages/cli"
  )
})

test("self-host benchmark summarizes public runner durations", async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "better-typescript-bench-"))
  const cliPath = path.join(rootPath, "cli.js")

  await fs.writeFile(cliPath, "")

  try {
    const report = await runSelfHostBenchmark(
      { rootPath, cliPath, checkNames: [] },
      { repetitions: 2, timeoutMs: 5_000 }
    )
    const [first, second] = report.durationsMs

    assert.equal(report.durationsMs.length, 2)
    assert.equal(report.minimumMs, Math.min(first!, second!))
    assert.equal(report.medianMs, (first! + second!) / 2)
    assert.equal(report.maximumMs, Math.max(first!, second!))
  } finally {
    await fs.rm(rootPath, { recursive: true, force: true })
  }
})
