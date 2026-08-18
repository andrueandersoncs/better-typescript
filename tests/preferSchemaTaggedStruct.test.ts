import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "bun:test"
import { fileURLToPath } from "node:url"
import { Array, Effect } from "effect"
import type { Detection } from "@better-typescript/core/engine/location/detectionData"
import { defaultWiring } from "@better-typescript/guidance/preset/defaultWiring"
import { preferSchemaTaggedStruct } from "@better-typescript/guidance/preset/effectIdiomPolicies"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { runPolicyOnProject } from "@better-typescript/core/project/loadProject/runPolicyOnProject"
import { isProgramPolicy } from "@better-typescript/core/engine/wiring/isProgramPolicy"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
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
      defaultWiring.policies
        .filter(isProgramPolicy)
        .map((named) => Effect.runPromise(runPolicyOnProject(named)(project)))
    )
  )

  return projectElements.flat()
}

test("prefer-schema-tagged-struct reports portable Data models and permits process-bound models", () =>
  assertPolicyFixture(preferSchemaTaggedStruct))

test("default preset activates the portable tagged-struct policy and allows process-bound data", async () => {
  const isActive = Array.some(
    defaultWiring.policies,
    (check) => check.name === "prefer-schema-tagged-struct"
  )
  const detections = await runDefaultFixture()

  assert.equal(isActive, true)
  assert.deepEqual(detections, [])
})
