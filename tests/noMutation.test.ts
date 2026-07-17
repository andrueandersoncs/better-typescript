import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Effect, Array } from "effect"
import { noMutation } from "@better-typescript/checks/noMutation"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import { assertCheckFixture } from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-mutation")

const runNoMutationFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const named = await Effect.runPromise(noMutation)
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runCheckOnProject(Array.of(named.check))(project))
    )
  )

  return projectElements.flat()
}

test("no-mutation reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noMutation))

test("no-mutation classifies each signal with a mutation target", async () => {
  const signals = await runNoMutationFixture()
  const targetsByLine = new Map(
    signals
      .filter((signal) => signal.location.path === "src/cases.ts")
      .map((signal) => [
        signal.location.line,
        (signal.data as { readonly target?: string } | undefined)?.target
      ])
  )

  assert.equal(targetsByLine.get(14), "shared-state")
  assert.equal(targetsByLine.get(16), "shared-state")
  assert.equal(targetsByLine.get(20), "shared-state")
  assert.equal(targetsByLine.get(25), "shared-state")
  assert.equal(targetsByLine.get(28), "local")
  assert.equal(targetsByLine.get(31), "builtin")
  assert.equal(targetsByLine.get(42), "local")
})
