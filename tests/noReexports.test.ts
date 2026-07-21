import * as assert from "node:assert/strict"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { Array, Effect } from "effect"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { noReexports } from "@better-typescript/guidance/policies/noReexports"
import { loadProject, runPolicyOnProject } from "@better-typescript/core/project/loadProject"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "architecture-evidence")

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const projectDetections = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runPolicyOnProject(Array.of(noReexports))(project))
    )
  )

  return projectDetections.flat()
}

test("no-reexports prohibits every imported binding export form", async () => {
  const detections = await runFixture()
  const reexportLocations = Array.map(
    detections.filter((detection) => detection.location.path === "src/reexports.ts"),
    (detection) => detection.location.line
  )

  assert.deepEqual(reexportLocations, [4, 5, 6, 7, 8, 9, 10])

  const defaultReexport = detections.find(
    (detection) => detection.location.path === "src/defaultReexport.ts"
  )

  assert.equal(defaultReexport?.location.line, 3)
})
