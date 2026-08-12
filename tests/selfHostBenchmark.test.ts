import * as assert from "node:assert/strict"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { test } from "bun:test"
import { fileURLToPath } from "node:url"
import selfHostConfig from "../better-typescript.config.js"
import { runSelfHostBenchmark, selfHostBenchmarkTarget } from "../bench/selfHostBenchmark.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.dirname(testDirectory)

test("self-host benchmark runs every enrolled policy", async () => {
  const target = await selfHostBenchmarkTarget(repoRoot)

  assert.equal(path.relative(repoRoot, target.cliPath), "packages/cli/dist/index.js")
  assert.equal(target.checkNames.length, 88)
  assert.ok(target.checkNames.includes("no-unused"))
  assert.ok(target.checkNames.includes("effect-quality-rules"))
  assert.ok(target.checkNames.includes("functional-core-effect-boundaries"))
  assert.ok(target.checkNames.includes("semantic-module-placement"))
  assert.equal(target.checkNames.includes("composition-fingerprints"), false)
  assert.equal(target.checkNames.includes("effect-quality-advice-evidence"), false)
  assert.equal(target.checkNames.includes("functional-core-effect-shape-evidence"), false)
})

test("self-host configuration pairs reporting wiring with silent placement", () => {
  assert.equal(selfHostConfig.length, 2)
  assert.ok(
    selfHostConfig.every((entry) => entry.files.includes("packages/*/src/**")),
    "every self-host wiring must cover packages/*/src/**"
  )

  const [reporting, placement] = selfHostConfig

  assert.ok(reporting!.wiring.policies.every((policy) => policy.reported))
  assert.deepEqual(reporting!.wiring.derive([]), [])
  assert.deepEqual(
    placement!.wiring.policies.map((policy) => policy.name),
    ["semantic-module-placement"]
  )
  assert.ok(placement!.wiring.policies.every((policy) => !policy.reported))
  assert.deepEqual(placement!.wiring.derive([]), [])
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
