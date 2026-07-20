import * as assert from "node:assert/strict"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { test } from "node:test"
import { Array, Effect } from "effect"
import {
  packageExamplePairRoots,
  packageExampleRoot,
  packageExamplesRoot
} from "./packageExamples.js"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import type { NamedCheck } from "@better-typescript/core/engine/wiring/data"
import {
  makeDirectoryRefactorExamples,
  makeRefactorExampleResolver
} from "@better-typescript/core/engine/example"
import { runCheckOnProject, loadProject } from "@better-typescript/core/project/loadProject"

const runSide = async (check: (typeof defaultWiring.checks)[number]["check"], sideRoot: string) => {
  const workspace = await Effect.runPromise(loadProject(sideRoot))
  const nested = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(check))(project))
    )
  )

  return nested.flat()
}

test("reported checks load fixture example trees with at least one pair", async () => {
  const reported = defaultWiring.checks.filter((check: NamedCheck) => check.reported)
  const resolve = await Effect.runPromise(makeRefactorExampleResolver())

  for (const named of reported) {
    const examples = await Effect.runPromise(resolve(named.examples))
    assert.ok(examples.length > 0, `${named.name} should declare refactor examples`)

    const exampleRoot = packageExampleRoot(named.name)
    assert.ok(fs.existsSync(exampleRoot), `${named.name} should have ${exampleRoot}`)
    assert.ok(
      packageExamplePairRoots(named.name).length > 0,
      `${named.name} should have <id>/{bad,good}`
    )
  }
})

test("fixture refactor examples: bad trees detect and good trees stay clean", async () => {
  const resolve = await Effect.runPromise(makeRefactorExampleResolver())
  const withExamples: Array<NamedCheck> = []

  for (const named of defaultWiring.checks) {
    const examples = await Effect.runPromise(resolve(named.examples))
    if (examples.length > 0) {
      withExamples.push(named)
    }
  }

  const failures: Array<string> = []

  for (const named of withExamples) {
    for (const pairRoot of packageExamplePairRoots(named.name)) {
      const pairName = path.basename(pairRoot)
      const badDetections = await runSide(named.check, path.join(pairRoot, "bad"))
      const goodDetections = await runSide(named.check, path.join(pairRoot, "good"))

      if (badDetections.length === 0) {
        failures.push(`${named.name} example/${pairName}/bad should detect`)
      }

      if (goodDetections.length > 0) {
        const details = goodDetections
          .map(
            (element) =>
              `${element.location.path}:${element.location.line}:${element.location.column} ${element.message}`
          )
          .join("; ")
        failures.push(`${named.name} example/${pairName}/good should stay clean, got ${details}`)
      }
    }
  }

  assert.deepEqual(failures, [])
  assert.ok(
    fs.existsSync(packageExamplesRoot),
    `package examples root should exist at ${packageExamplesRoot}`
  )
})

test("example resolver retries failures and caches successful directory loads", async (context) => {
  const exampleRoot = fs.mkdtempSync(path.join(os.tmpdir(), "better-typescript-examples-"))
  const source = makeDirectoryRefactorExamples(exampleRoot)
  const resolve = await Effect.runPromise(makeRefactorExampleResolver())

  context.after(() => fs.rmSync(exampleRoot, { recursive: true, force: true }))

  await assert.rejects(Effect.runPromise(resolve(source)))

  const badRoot = path.join(exampleRoot, "1", "bad")
  const goodRoot = path.join(exampleRoot, "1", "good")
  fs.mkdirSync(badRoot, { recursive: true })
  fs.mkdirSync(goodRoot, { recursive: true })
  fs.writeFileSync(path.join(badRoot, "case.ts"), "export const bad = true")
  fs.writeFileSync(path.join(goodRoot, "case.ts"), "export const good = true")

  const loaded = await Effect.runPromise(resolve(source))
  fs.rmSync(exampleRoot, { recursive: true, force: true })
  const cached = await Effect.runPromise(resolve(source))

  assert.equal(loaded.length, 1)
  assert.strictEqual(cached, loaded)
})
