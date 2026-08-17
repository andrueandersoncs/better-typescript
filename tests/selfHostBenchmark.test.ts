import * as assert from "node:assert/strict"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { test } from "bun:test"
import { fileURLToPath } from "node:url"
import selfHostConfig from "../better-typescript.config.js"
import { architectureExploreWiring } from "@better-typescript/guidance/architectureExplore/architectureExploreWiring"
import { effectQualityWiring } from "@better-typescript/guidance/effectQuality/advice"
import { functionalCoreEffectWiring } from "@better-typescript/guidance/functionalCoreEffect/advice"
import { defaultWiring } from "@better-typescript/guidance/preset/defaultWiring"
import { selfHostArchitectureFiles, selfHostProductFiles } from "../selfHostFiles.js"
import { productSelfHostWiring } from "../selfHostWiring.js"
import { runSelfHostBenchmark, selfHostBenchmarkTarget } from "../scripts/selfHostBenchmark.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.dirname(testDirectory)

test("self-host benchmark runs every complete Wiring policy", async () => {
  const target = await selfHostBenchmarkTarget(repoRoot)
  const productNames = [defaultWiring, functionalCoreEffectWiring, effectQualityWiring].flatMap(
    (wiring) => wiring.policies.map((policy) => policy.name)
  )
  const architectureNames = architectureExploreWiring.policies.map((policy) => policy.name)

  assert.equal(path.relative(repoRoot, target.cliPath), "packages/cli/dist/index.js")
  assert.deepEqual(target.checkNames, [...productNames, ...architectureNames])
  assert.equal(new Set(target.checkNames).size, 105)
  assert.ok(target.checkNames.includes("composition-fingerprints"))
  assert.ok(target.checkNames.includes("effect-quality-advice-evidence"))
  assert.ok(target.checkNames.includes("functional-core-effect-shape-evidence"))
})

test("self-host configuration scopes complete Wirings without reconstructing them", () => {
  assert.equal(selfHostConfig.length, 2)

  const [product, architecture] = selfHostConfig

  assert.deepEqual(product?.files, selfHostProductFiles)
  assert.strictEqual(product?.wiring.policies, productSelfHostWiring.policies)
  assert.strictEqual(product?.wiring.derive, productSelfHostWiring.derive)
  assert.deepEqual(architecture?.files, selfHostArchitectureFiles)
  assert.strictEqual(architecture?.wiring.policies, architectureExploreWiring.policies)
  assert.strictEqual(architecture?.wiring.derive, architectureExploreWiring.derive)
  assert.ok(product?.wiring.policies.some((policy) => !policy.reported))
  assert.ok(architecture?.wiring.policies.every((policy) => !policy.reported))
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
