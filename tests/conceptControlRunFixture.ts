import { Array, Effect } from "effect"
import { conceptControl } from "@better-typescript/guidance/preset/defaultWiring"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { runPolicyOnProject } from "@better-typescript/core/project/loadProject/runPolicyOnProject"
import { fixturePath } from "./conceptControlFixturePaths.js"

export const runFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const projects = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runPolicyOnProject(Array.of(conceptControl))(project))
    )
  )

  return projects.flat()
}
