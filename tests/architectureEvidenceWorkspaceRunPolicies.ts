import { Array, Effect } from "effect"
import { type Policy } from "@better-typescript/core/engine/policy/policyClass"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { toPolicies } from "@better-typescript/core/engine/policy/locateTarget"
import { ProgramContext } from "@better-typescript/matchers/sources/data"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { fixturePath } from "./architectureEvidenceWorkspaceFixturePaths.js"
import { includeEverySourceFile } from "./architectureEvidenceWorkspaceIncludeEverySourceFile.js"

export const runWorkspacePolicies = async (
  policies: ReadonlyArray<Policy>
): Promise<{
  readonly rootPath: string
  readonly detectionsByPolicy: ReadonlyArray<ReadonlyArray<Detection>>
}> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const executablePolicies = policies

  const detectionsByPolicy = Array.reduce(
    workspace.projects,
    Array.map(executablePolicies, () => Array.empty<Detection>()),
    (current, project) => {
      const loaded = makeContext(project.rootPath)(project.program)

      const context = ProgramContext.make({
        program: loaded.program,
        checker: loaded.checker,
        projectRoot: loaded.projectRoot,
        workspaceRoot: workspace.rootPath
      })

      const projectDetections = toPolicies(executablePolicies)(includeEverySourceFile)(context)

      return Array.map(current, (detections, checkIndex) =>
        Array.appendAll(detections, projectDetections[checkIndex] ?? Array.empty())
      )
    }
  )

  return {
    rootPath: workspace.rootPath,
    detectionsByPolicy
  }
}
