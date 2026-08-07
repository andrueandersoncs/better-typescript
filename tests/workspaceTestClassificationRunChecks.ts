import * as path from "node:path"
import { Array, Effect, Function } from "effect"
import { type Policy } from "@better-typescript/core/engine/policy/policyClass"
import { type Detection } from "@better-typescript/core/engine/location/detectionData"
import { ProgramContext } from "@better-typescript/matchers/sources/data"
import { makeContext } from "@better-typescript/matchers/sources/makeContext"
import { toPolicies } from "@better-typescript/core/engine/policy/locateTarget"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { fixturePath } from "./workspaceTestClassificationFixturePath.js"

export const includeEverySourceFile = Function.constant(true)

// Detections carry project-relative paths, so joins against the fixture use workspace paths.
export const workspacePathFor =
  (workspaceRoot: string, projectRoot: string) =>
  (detection: Detection): string => {
    const absolutePath = path.resolve(projectRoot, detection.location.path)

    return path.relative(workspaceRoot, absolutePath).replaceAll(path.sep, "/")
  }

export const runWorkspaceChecks = async (
  policies: ReadonlyArray<Policy>
): Promise<ReadonlyArray<ReadonlyArray<string>>> => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const executablePolicies = policies

  return Array.reduce(
    workspace.projects,
    Array.map(executablePolicies, () => Array.empty<string>()),
    (current, project) => {
      const loaded = makeContext(project.rootPath)(project.program)

      const context = ProgramContext.make({
        program: loaded.program,
        checker: loaded.checker,
        projectRoot: loaded.projectRoot,
        workspaceRoot: workspace.rootPath
      })

      const projectDetections = toPolicies(executablePolicies)(includeEverySourceFile)(context)
      const toWorkspacePath = workspacePathFor(workspace.rootPath, project.rootPath)

      return Array.map(current, (paths, checkIndex) => {
        const detections = projectDetections[checkIndex] ?? Array.empty<Detection>()

        return Array.appendAll(paths, Array.map(detections, toWorkspacePath))
      })
    }
  )
}
