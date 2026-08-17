import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { Effect, Array } from "effect"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { runPolicyOnProject } from "@better-typescript/core/project/loadProject/runPolicyOnProject"
import { noLongComments } from "@better-typescript/guidance/preset/commentAndDeclarationPolicies"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(testDirectory, "fixtures", "no-long-comments")

export const runNoLongCommentsFixture = async (): Promise<ReadonlyArray<Detection>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))

  const projectElements = await Promise.all(
    workspace.projects.map((project) =>
      Effect.runPromise(runPolicyOnProject(Array.of(noLongComments))(project))
    )
  )

  return projectElements.flat()
}
