import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { Effect, Array } from "effect"
import { type Policy } from "@better-typescript/core/engine/policy/policyClass"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { runPolicyOnProject } from "@better-typescript/core/project/loadProject/runPolicyOnProject"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
export const fixturePath = path.join(testDirectory, "fixtures", "architecture-evidence-fp")

export const runFixture = async (named: Policy): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const projectDetections = await Promise.all(
    workspace.projects.map((project) => Effect.runPromise(runPolicyOnProject(named)(project)))
  )

  return projectDetections.flat()
}
