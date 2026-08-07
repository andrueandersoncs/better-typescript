import { Effect } from "effect"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { type Policy } from "@better-typescript/core/engine/policy/policyClass"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { runPolicyOnProject } from "@better-typescript/core/project/loadProject/runPolicyOnProject"
import { fixturePath } from "./semanticModulePlacementReportFixturePath.js"

export const runFixturePolicy = async (policy: Policy): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const projectDetections = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runPolicyOnProject(Array.of(policy))(project))
    )
  )

  return projectDetections.flat()
}
