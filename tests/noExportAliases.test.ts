import * as assert from "node:assert/strict"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"
import { Array, Effect } from "effect"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { noExportAliases } from "@better-typescript/guidance/policies/noExportAliases"
import { loadProject, runPolicyOnProject } from "@better-typescript/core/project/loadProject"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "architecture-evidence")

const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const projectDetections = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runPolicyOnProject(Array.of(noExportAliases))(project))
    )
  )

  return projectDetections.flat()
}

test("no-export-aliases prohibits exported identifier aliases", async () => {
  const detections = await runFixture()
  const aliases = detections.filter(
    (detection) => detection.location.path === "src/exportAliases.ts"
  )

  assert.deepEqual(
    aliases.map((detection) => detection.location.line),
    [4, 5]
  )
  assert.ok(
    aliases.every(
      (detection) =>
        detection.hint ===
        "Name functions appropriately from the start; don't implement export aliases."
    )
  )
})
