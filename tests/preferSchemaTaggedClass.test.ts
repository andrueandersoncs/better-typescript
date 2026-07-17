import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Array, Effect } from "effect"
import { preferSchemaTaggedClass } from "@better-typescript/checks/preferSchemaTaggedClass"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { loadProject, runCheckOnProject } from "@better-typescript/core/project/loadProject"
import { assertCheckFixture } from "./ruleTestAssertions.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const processBoundFixturePath = path.join(
  testDirectory,
  "fixtures",
  "default-allows-data-tagged-class"
)
const wiring = await Effect.runPromise(defaultWiring)

const runDefaultFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(processBoundFixturePath))

  const projectElements = await Promise.all(
    workspace.projects.flatMap((project) =>
      wiring.checks.map((named) =>
        Effect.runPromise(runCheckOnProject(Array.of(named.check))(project))
      )
    )
  )

  return projectElements.flat()
}

test("prefer-schema-tagged-class reports portable Data models and permits process-bound models", () =>
  assertCheckFixture(preferSchemaTaggedClass))

test("default preset activates the portable tagged-class policy and allows process-bound data", async () => {
  const isActive = Array.some(wiring.checks, (check) => check.name === "prefer-schema-tagged-class")
  const detections = await runDefaultFixture()

  assert.equal(isActive, true)
  assert.deepEqual(detections, [])
})
