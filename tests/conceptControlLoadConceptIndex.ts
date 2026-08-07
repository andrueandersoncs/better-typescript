import * as assert from "node:assert/strict"
import { Effect } from "effect"
import { buildConceptIndex } from "@better-typescript/matchers/builtins/conceptControl/conceptControlEngine"
import { ProgramContext } from "@better-typescript/matchers/sources/data"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { fixturePath } from "./conceptControlFixturePaths.js"

export const loadConceptIndex = async () => {
  const workspace = await Effect.runPromise(loadProject(fixturePath))
  const project = workspace.projects[0]

  assert.ok(project, "concept-control fixture project was not loaded")

  return buildConceptIndex(
    ProgramContext.make({
      program: project.program,
      checker: project.program.getTypeChecker(),
      projectRoot: project.rootPath,
      workspaceRoot: project.rootPath
    })
  )
}
