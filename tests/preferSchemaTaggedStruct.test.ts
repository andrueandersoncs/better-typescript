import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { Array, Effect } from "effect"
import { preferSchemaTaggedStruct } from "@better-typescript/checks/preferSchemaTaggedStruct"
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

const runDefaultFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(processBoundFixturePath))

  const projectElements = await Promise.all(
    workspace.projects.flatMap((project) =>
      defaultWiring.checks.map((named) =>
        Effect.runPromise(runCheckOnProject(Array.of(named.check))(project))
      )
    )
  )

  return projectElements.flat()
}

test("prefer-schema-tagged-struct reports portable Data models and permits process-bound models", () =>
  assertCheckFixture(preferSchemaTaggedStruct))

test("default preset activates the portable tagged-struct policy and allows process-bound data", async () => {
  const isActive = Array.some(
    defaultWiring.checks,
    (check) => check.name === "prefer-schema-tagged-struct"
  )
  const detections = await runDefaultFixture()

  assert.equal(isActive, true)
  assert.deepEqual(detections, [])
})
